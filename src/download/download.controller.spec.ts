import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { ApiResponse } from '../common/helpers/api-response';
import { StreamableFile } from '@nestjs/common';

/* FACTORIES */
const makeDeps = () => ({
  downloadService: {
    getMeta:  jest.fn(),
    download: jest.fn(),
  } as unknown as DownloadService,
});

describe('DownloadController', () => {
  let controller: DownloadController;
  let downloadService: ReturnType<typeof makeDeps>['downloadService'];

  beforeEach(() => {
    const deps = makeDeps();
    downloadService = deps.downloadService;
    controller      = new DownloadController(downloadService);
  });

  afterEach(() => jest.clearAllMocks());

  /* DC.1 getMeta() */
  describe('DC.1 getMeta()', () => {
    it('DC.1.1 returns metadata wrapped in success envelope', async () => {
      /* Arrange */
      const meta = { filename: 'photo.jpg', size: 1024, mimeType: 'image/jpeg', requiresPassword: false };
      (downloadService.getMeta as jest.Mock).mockResolvedValueOnce(meta);

      /* Act */
      const result = await controller.getMeta('tok-abc');

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Métadonnées récupérées', meta));
      expect(downloadService.getMeta).toHaveBeenCalledWith('tok-abc');
    });
  });

  /* DC.2 download() */
  describe('DC.2 download()', () => {
    it('DC.2.1 returns the StreamableFile from service', async () => {
      /* Arrange */
      const streamable = {} as unknown as StreamableFile;
      (downloadService.download as jest.Mock).mockResolvedValueOnce(streamable);
      const dto = {} as any;

      /* Act */
      const result = await controller.download('tok-abc', dto);

      /* Assert */
      expect(result).toBe(streamable);
      expect(downloadService.download).toHaveBeenCalledWith('tok-abc', dto);
    });

    it('DC.2.2 passes dto with password through to service', async () => {
      /* Arrange */
      const streamable = {} as unknown as StreamableFile;
      (downloadService.download as jest.Mock).mockResolvedValueOnce(streamable);
      const dto = { password: 'secret123' } as any;

      /* Act */
      await controller.download('tok-pw', dto);

      /* Assert */
      expect(downloadService.download).toHaveBeenCalledWith('tok-pw', dto);
    });
  });
});
