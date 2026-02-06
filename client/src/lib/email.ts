import emailjs from '@emailjs/browser';

// Configuration keys - In production these should be env vars
// For now matching prototype.html values
const EMAIL_CONFIG = {
    SERVICE_ID: "service_937191d",
    TEMPLATE_ID: "template_6m070jo",
    PUBLIC_KEY: "15yzEVB4O5kIXWLUS"
};

export const sendEmail = async (toEmail: string, subject: string, body: string, variables: Record<string, any> = {}) => {
    const { SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY } = EMAIL_CONFIG;

    try {
        const templateParams = {
            to_email: toEmail,
            subject: subject,
            message: body,
            ...variables
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        return { text: 'OK', status: response.status };
    } catch (error) {
        console.error('Email send failed:', error);
        throw error;
    }
};
