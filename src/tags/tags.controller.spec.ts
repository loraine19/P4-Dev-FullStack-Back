import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { ApiResponse } from '../common/helpers/api-response';

/* FACTORIES */
const makeDeps = () => ({
  tagsService: {
    findAll: jest.fn(),
    create:  jest.fn(),
    remove:  jest.fn(),
  } as unknown as TagsService,
});

const MOCK_USER_ID = 1;

describe('TagsController', () => {
  let controller: TagsController;
  let tagsService: ReturnType<typeof makeDeps>['tagsService'];

  beforeEach(() => {
    const deps = makeDeps();
    tagsService = deps.tagsService;
    controller  = new TagsController(tagsService);
  });

  afterEach(() => jest.clearAllMocks());

  /* TC.1 findAll() */
  describe('TC.1 findAll()', () => {
    it('TC.1.1 returns user tags wrapped in success envelope', async () => {
      /* Arrange */
      const tags = [{ id: 1, name: 'react', userId: 1 }, { id: 2, name: 'node', userId: 1 }];
      (tagsService.findAll as jest.Mock).mockResolvedValueOnce(tags);

      /* Act */
      const result = await controller.findAll(MOCK_USER_ID);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Tags récupérés', tags));
      expect(tagsService.findAll).toHaveBeenCalledWith(MOCK_USER_ID);
    });
  });

  /* TC.2 create() */
  describe('TC.2 create()', () => {
    it('TC.2.1 creates a tag and returns 201 envelope', async () => {
      /* Arrange */
      const tag = { id: 3, name: 'typescript', userId: 1 };
      (tagsService.create as jest.Mock).mockResolvedValueOnce(tag);
      const dto = { name: 'typescript' } as any;

      /* Act */
      const result = await controller.create(dto, MOCK_USER_ID);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Tag créé', tag));
      expect(tagsService.create).toHaveBeenCalledWith(dto, MOCK_USER_ID);
    });
  });

  /* TC.3 remove() */
  describe('TC.3 remove()', () => {
    it('TC.3.1 calls tagsService.remove with tag id and userId', async () => {
      /* Arrange */
      (tagsService.remove as jest.Mock).mockResolvedValueOnce(undefined);

      /* Act */
      await controller.remove(1, MOCK_USER_ID);

      /* Assert */
      expect(tagsService.remove).toHaveBeenCalledWith(1, MOCK_USER_ID);
    });
  });
});
