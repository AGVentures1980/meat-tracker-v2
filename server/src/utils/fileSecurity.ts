const MAX_SIZES_MB = {
    'application/pdf': 15,
    'image/jpeg': 8,
    'image/png': 8
};

const EXTENSION_MAP: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png'
};

export class FileSecurity {
    static validate(mimeType: string, sizeBytes: number): string {
        const maxSize = MAX_SIZES_MB[mimeType as keyof typeof MAX_SIZES_MB];
        if (!maxSize) {
            throw new Error(`400: Unsupported MIME type (${mimeType})`);
        }

        const maxBytes = maxSize * 1024 * 1024;
        if (sizeBytes > maxBytes) {
            throw new Error(`400: File size exceeds ${maxSize}MB limit for this file type`);
        }

        return EXTENSION_MAP[mimeType as keyof typeof EXTENSION_MAP] || 'bin';
    }
}
