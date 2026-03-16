import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as docusign from 'docusign-esign';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const ContractController = {
    // Generate a new Deal Contract
    generateContract: async (req: Request, res: Response) => {
        try {
            const { company_name, signer_name, signer_email, price, locations_count } = req.body;

            if (!company_name || !signer_name || !signer_email || !price || !locations_count) {
                return res.status(400).json({ error: 'Missing required contract parameters.' });
            }

            // Create record in Database as DRAFT
            const contract = await prisma.contractDocument.create({
                data: {
                    company_name,
                    signer_name,
                    signer_email,
                    price: parseFloat(price),
                    locations_count: parseInt(locations_count, 10),
                    status: 'DRAFT'
                }
            });

            return res.status(201).json({ 
                message: 'Contract Draft Generated Successfully',
                contract 
            });

        } catch (error) {
            console.error('Error generating contract:', error);
            return res.status(500).json({ error: 'Internal server error while generating contract' });
        }
    },

    // Dispatch the contract for E-Signature (Real DocuSign API Call)
    dispatchSignatureRequest: async (req: Request, res: Response) => {
        try {
            const { contractId } = req.body;

            const contract = await prisma.contractDocument.findUnique({
                where: { id: contractId }
            });

            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            // DocuSign Config
            const integratorKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
            const userId = process.env.DOCUSIGN_USER_ID!;
            const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
            const basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
            
            // Read RSA Key (from env string for production, or fallback to file for local dev)
            let rsaKey: string | Buffer;
            if (process.env.DOCUSIGN_RSA_PRIVATE_KEY) {
                rsaKey = Buffer.from(process.env.DOCUSIGN_RSA_PRIVATE_KEY.replace(/\\n/g, '\n'), 'utf8');
            } else {
                const rsaKeyFile = path.resolve(__dirname, '../../', process.env.DOCUSIGN_RSA_KEY_FILE || 'docusign_private_key.pem');
                rsaKey = fs.readFileSync(rsaKeyFile); // Returns Buffer
            }

            console.log('Authenticating with DocuSign JWT...');
            const apiClient = new docusign.ApiClient();
            apiClient.setBasePath(basePath);

            // Request JWT Token
            const results = await apiClient.requestJWTUserToken(
                integratorKey,
                userId,
                ['signature', 'impersonation'],
                rsaKey,
                3600 // Expiry in 1 hour
            );

            apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
            
            console.log('Building Envelope');
            const ds = docusign as any;
            const envDef = new ds.EnvelopeDefinition();
            envDef.emailSubject = `Signature Required: Software License Agreement - ${contract.company_name}`;
            
            // Generate HTML Document for Contract
            const documentHtml = `
            <!DOCTYPE html>
            <html>
                <body>
                    <h1 style="text-align: center; font-family: sans-serif;">Master Software As A Service Agreement</h1>
                    <p style="font-family: sans-serif;">This Master SaaS Agreement is entered into as of <strong>${contract.created_at.toLocaleDateString()}</strong> by and between <strong>Brasa Intel (AGV Ventures LLC)</strong> and <strong>${contract.company_name}</strong>.</p>
                    <br/>
                    <p style="font-family: sans-serif;"><strong>1. SCOPE OF PILOT:</strong> Provider will deploy the Brasa Meat Intelligence OS to <strong>${contract.locations_count}</strong> pilot locations for the duration of 90 days.</p>
                    <p style="font-family: sans-serif;"><strong>2. COMMERCIAL TERMS:</strong> Client agrees to a monthly recurring software license fee of <strong>$${contract.price}.00 USD</strong>. Execution of this digital document legally binds the signatory, <strong>${contract.signer_name} (${contract.signer_email})</strong>, to these terms.</p>
                    <br/><br/>
                    <div style="font-family: sans-serif;">
                        <span style="color:white;">SIGN_HERE</span>
                    </div>
                </body>
            </html>
            `;
            
            // Construct the DocuSign Document Object
            const document = new ds.Document();
            document.documentBase64 = Buffer.from(documentHtml).toString('base64');
            document.name = 'Master SaaS Agreement';
            document.fileExtension = 'html';
            document.documentId = '1';

            envDef.documents = [document];

            // Setup Signer
            const signer = ds.Signer.constructFromObject({
                email: contract.signer_email,
                name: contract.signer_name,
                recipientId: '1',
                routingOrder: '1'
            });

            // Anchor Tab (Signature Box Placement)
            const signHere = ds.SignHere.constructFromObject({
                anchorString: 'SIGN_HERE',
                anchorYOffset: '10',
                anchorUnits: 'pixels',
                anchorXOffset: '20'
            });

            const tabs = ds.Tabs.constructFromObject({
                signHereTabs: [signHere]
            });
            signer.tabs = tabs;

            envDef.recipients = ds.Recipients.constructFromObject({
                signers: [signer]
            });

            // Set envelope status to 'sent' to fire it immediately
            envDef.status = 'sent';

            console.log('Sending Envelope API request');
            const envelopesApi = new docusign.EnvelopesApi(apiClient);
            const envelopeSummary = await envelopesApi.createEnvelope(accountId, {
                envelopeDefinition: envDef
            });

            console.log(`Envelope Sent! ID: ${envelopeSummary.envelopeId}`);

            // Update Database to SENT
            const updated = await prisma.contractDocument.update({
                where: { id: contractId },
                data: {
                    status: 'SENT',
                    api_envelope_id: envelopeSummary.envelopeId,
                    contract_url: `https://demo.docusign.net/Member/EmailStart.aspx?a=${accountId}&acct=${accountId}&en=${envelopeSummary.envelopeId}` // Approximation link for admin reference
                }
            });

            return res.status(200).json({
                message: 'Document dispatched successfully to Signatory via DocuSign.',
                status: 'SENT',
                envelopeId: envelopeSummary.envelopeId,
                signUrl: updated.contract_url
            });

        } catch (error: any) {
            console.error('Error dispatching signature:', error.response?.body || error);
            // Catch specific consent required error
            if (error.response?.body?.error === 'consent_required') {
                const consentUrl = `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${process.env.DOCUSIGN_INTEGRATION_KEY}&redirect_uri=http://localhost:3000`;
                return res.status(403).json({ 
                    error: 'DocuSign Consent Required', 
                    consentUrl 
                });
            }
            return res.status(500).json({ error: 'Failed to dispatch document to DocuSign.' });
        }
    },

    // Simulate the Webhook callback from DocuSign saying the document is signed
    simulateSignatureWebhook: async (req: Request, res: Response) => {
        try {
            const { contractId } = req.body;

            const updated = await prisma.contractDocument.update({
                where: { id: contractId },
                data: {
                    status: 'EXECUTED'
                }
            });

            return res.status(200).json({
                message: 'Webhook processed. Contract is legally Executed.',
                contract: updated
            });

        } catch (error) {
            console.error('Error processing webhook:', error);
            return res.status(500).json({ error: 'Failed to process webhook.' });
        }
    },

    // Fetch all contracts for the Vault
    getAllContracts: async (req: Request, res: Response) => {
        try {
            const contracts = await prisma.contractDocument.findMany({
                orderBy: { created_at: 'desc' },
                take: 50 // Limit to most recent 50
            });

            return res.status(200).json(contracts);
        } catch (error) {
            console.error('Error fetching contracts:', error);
            return res.status(500).json({ error: 'Failed to fetch vault records' });
        }
    }
};
