export class FileEntity {
  id: number;
  userId: number | null;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  shareToken: string;
  downloadPasswordHash: string | null;
  expiresAt: Date;
  createdAt: Date;
}
