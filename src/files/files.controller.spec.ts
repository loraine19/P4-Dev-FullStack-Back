import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ApiResponse } from '../common/helpers/api-response';

/* FACTORIES */
const makeFileItem = (id = 1) => ({
  id,
  originalName: 'photo.jpg',
  shareToken:   'tok-abc',
  passwordProtected: false,
  expiresAt:    null,
  tags:         [],
});

const makeDeps = () => ({
  filesService: {
    upload:   jest.fn(),
    findAll:  jest.fn(),
    remove:   jest.fn(),
  } as unknown as FilesService,
});

const MOCK_USER = { sub: 1, email: 'alice@test.com' } as any;

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: ReturnType<typeof makeDeps>['filesService'];

  beforeEach(() => {
    const deps = makeDeps();
    filesService = deps.filesService;
    controller   = new FilesController(filesService);
  });

  afterEach(() => jest.clearAllMocks());

  /* FC.1 upload() */
  describe('FC.1 upload()', () => {
    it('FC.1.1 uploads for authenticated user and returns 201 envelope', async () => {
      /* Arrange */
      const fileItem   = makeFileItem();
      (filesService.upload as jest.Mock).mockResolvedValueOnce(fileItem);
      const multerFile = { originalname: 'photo.jpg', size: 1024 } as any;
      const dto        = { expirationDays: '7' } as any;

      /* Act */
      const result = await controller.upload(multerFile, dto, MOCK_USER);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Fichier uploadé', fileItem));
      expect(filesService.upload).toHaveBeenCalledWith(multerFile, dto, MOCK_USER.sub);
    });
  });

  /* FC.2 uploadAnonymous() */
  describe('FC.2 uploadAnonymous()', () => {
    it('FC.2.1 null user → calls service with userId undefined', async () => {
      /* Arrange */
      const fileItem   = makeFileItem();
      (filesService.upload as jest.Mock).mockResolvedValueOnce(fileItem);
      const multerFile = { originalname: 'anon.txt' } as any;

      /* Act */
      const result = await controller.uploadAnonymous(multerFile, {} as any, null);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Fichier uploadé', fileItem));
      expect(filesService.upload).toHaveBeenCalledWith(multerFile, {}, undefined);
    });

    it('FC.2.2 authenticated user → calls service with userId', async () => {
      /* Arrange */
      const fileItem = makeFileItem();
      (filesService.upload as jest.Mock).mockResolvedValueOnce(fileItem);
      const user = { sub: 2, email: 'bob@test.com' } as any;

      /* Act */
      await controller.uploadAnonymous({ originalname: 'file.pdf' } as any, {} as any, user);

      /* Assert */
      expect(filesService.upload).toHaveBeenCalledWith(expect.anything(), {}, 2);
    });
  });

  /* FC.3 findAll() */
  describe('FC.3 findAll()', () => {
    it('FC.3.1 returns all files wrapped in success envelope', async () => {
      /* Arrange */
      const files = [makeFileItem(1), makeFileItem(2)];
      (filesService.findAll as jest.Mock).mockResolvedValueOnce(files);

      /* Act */
      const result = await controller.findAll(MOCK_USER);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Fichiers récupérés', files));
      expect(filesService.findAll).toHaveBeenCalledWith(MOCK_USER.sub);
    });
  });

  /* FC.4 remove() */
  describe('FC.4 remove()', () => {
    it('FC.4.1 calls filesService.remove with file id and userId', async () => {
      /* Arrange */
      (filesService.remove as jest.Mock).mockResolvedValueOnce(undefined);

      /* Act */
      await controller.remove(1, MOCK_USER);

      /* Assert */
      expect(filesService.remove).toHaveBeenCalledWith(1, MOCK_USER.sub);
    });
  });
});
