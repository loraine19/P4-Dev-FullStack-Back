/* IFILE RESPONSE */
export interface IFileResponse {
  id: number;
  originalName: string;
  size: number;
  mimeType: string;
  shareToken: string;
  passwordProtected: boolean;
  expiresAt: Date;
  createdAt: Date;
  tags: { id: number; name: string }[];
}

