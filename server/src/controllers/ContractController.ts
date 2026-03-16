import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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

    // Dispatch the contract for E-Signature (Mocking DocuSign API behavior)
    dispatchSignatureRequest: async (req: Request, res: Response) => {
        try {
            const { contractId } = req.body;

            const contract = await prisma.contractDocument.findUnique({
                where: { id: contractId }
            });

            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            // Simulate 3rd Party API Call (DocuSign Envelope Creation)
            const mockEnvelopeId = `DOCUSIGN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            // Update Database to SENT
            const updated = await prisma.contractDocument.update({
                where: { id: contractId },
                data: {
                    status: 'SENT',
                    api_envelope_id: mockEnvelopeId,
                    contract_url: `https://mock.docusign.net/sign/${mockEnvelopeId}`
                }
            });

            return res.status(200).json({
                message: 'Document dispatched successfully to Signatory.',
                status: 'SENT',
                envelopeId: mockEnvelopeId,
                signUrl: updated.contract_url
            });

        } catch (error) {
            console.error('Error dispatching signature:', error);
            return res.status(500).json({ error: 'Failed to dispatch document.' });
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
