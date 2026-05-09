export interface FileResponse {
  id: number;
  originalName: string;
  size: number;
  mimeType: string;
  shareToken: string;
  passwordProtected: boolean;
  expiresAt: Date;
  createdAt: Date;
}
