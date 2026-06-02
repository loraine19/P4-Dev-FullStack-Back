import type { Prisma } from '@prisma/client';

/* IATTACH TO FILE PARAMS */
export interface IAttachToFileParams {
  fileId: number;
  tagIds: number[];
  userId: number;
  tx: Prisma.TransactionClient;
}
