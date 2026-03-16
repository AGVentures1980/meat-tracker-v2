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
                <head>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 40px; }
                        .header { text-align: center; border-bottom: 2px solid #C5A059; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo-text { font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #111; text-transform: uppercase; }
                        .logo-sub { font-size: 10px; font-weight: bold; letter-spacing: 4px; color: #C5A059; text-transform: uppercase; display: block; margin-top: 5px; }
                        .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
                        .section-title { font-size: 14px; font-weight: bold; color: #111; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                        p { font-size: 12px; text-align: justify; margin-bottom: 15px; }
                        .highlight { font-weight: bold; color: #000; }
                        .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
                        .signature-block { margin-top: 40px; width: 100%; }
                        .sign-box { border: 1px dashed #ccc; padding: 20px; text-align: center; background: #fafafa; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-text">AGV Ventures</div>
                        <span class="logo-sub">Technology Holdings & Licensing</span>
                    </div>
                    
                    <div class="title">Master Software Evaluation & SaaS Agreement</div>
                    
                    <p>This Master Agreement (the "Agreement") is entered into as of <span class="highlight">${contract.created_at.toLocaleDateString()}</span> (the "Effective Date") by and between <span class="highlight">AGV Ventures LLC</span> ("Licensor" or "Owner") and <span class="highlight">${contract.company_name}</span> ("Client").</p>
                    
                    <div class="section-title">1. Ownership & Intellectual Property</div>
                    <p>The <span class="highlight">Brasa Meat Intelligence</span> platform, algorithms, source codes, trademarks, operational methodologies (including the "Garcia Rule"), and all related intellectual property are owned exclusively by <span class="highlight">AGV Ventures LLC</span>. The software is merely licensed, not sold, to the Client under the terms of this Agreement. The Client hereby acknowledges that they hold no ownership rights over the software or any derivative works.</p>

                    <div class="section-title">2. Pilot Evaluation Program</div>
                    <p>Licensor agrees to deploy the Brasa Meat Intelligence operating system to <span class="highlight">${contract.locations_count}</span> pilot locations for a 90-day evaluation period. During this period, both parties agree to mutual confidentiality regarding proprietary business metrics, strategic workflows, and software interfaces (Mutual NDA).</p>
                    
                    <div class="section-title">3. Commercial Terms & Transition</div>
                    <p>Upon successful conclusion of the Pilot Program, this Agreement automatically transitions to an active monthly Software-as-a-Service (SaaS) license. The Client agrees to a recurring monthly software licensing fee of <span class="highlight">$${contract.price.toLocaleString()}.00 USD</span>. This fee grants the Client non-exclusive, non-transferable access for the authorized locations.</p>

                    <div class="section-title">4. Liability Shield</div>
                    <p>In no event shall AGV Ventures LLC, its founders, members, or affiliates be liable for any indirect, incidental, or consequential damages arising out of the use or inability to use the Software. Total liability of AGV Ventures LLC shall not exceed the amount paid by the Client for the software license.</p>

                    <div class="signature-block">
                        <p>Execution of this digital document legally binds the signatory, <span class="highlight">${contract.signer_name} (${contract.signer_email})</span> representing ${contract.company_name}, to these terms.</p>
                        <div class="sign-box">
                            <span style="color:#fafafa; font-size:1px;">SIGN_HERE</span>
                        </div>
                    </div>

                    <div class="footer">
                        AGV Ventures LLC • Proprietary & Confidential Document<br>
                        Generated by Brasa Meat Intelligence Deal Desk • Document ID: ${contract.id.split('-')[0]}
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
            return res.status(500).json({ error: 'Failed to fetch contracts.' });
        }
    },

    // Update an existing DRAFT contract
    updateContract: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { company_name, signer_name, signer_email, price, locations_count } = req.body;

            const existing = await prisma.contractDocument.findUnique({ where: { id } });
            if (!existing || existing.status !== 'DRAFT') {
                return res.status(400).json({ error: 'Contract not found or cannot be modified.' });
            }

            const updated = await prisma.contractDocument.update({
                where: { id },
                data: {
                    company_name,
                    signer_name,
                    signer_email,
                    price: parseFloat(price),
                    locations_count: parseInt(locations_count, 10),
                }
            });

            return res.status(200).json({ message: 'Contract updated', contract: updated });
        } catch (error) {
            console.error('Error updating contract:', error);
            return res.status(500).json({ error: 'Failed to update contract.' });
        }
    },

    // Delete a contract
    deleteContract: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await prisma.contractDocument.delete({
                where: { id }
            });
            return res.status(200).json({ message: 'Contract deleted successfully.' });
        } catch (error) {
            console.error('Error deleting contract:', error);
            return res.status(500).json({ error: 'Failed to delete contract.' });
        }
    }
};
