import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../../infrastructure/http-client.service';
import { CategoryQueryDto, CreateCategoryBffDto } from './categories.dto';

export interface MobileCategoryItem {
  id: string;
  name: string;
  type: string;
  color: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly httpClient: HttpClientService) {}

  async findAll(
    accessToken: string,
    query: CategoryQueryDto
  ): Promise<{ items: MobileCategoryItem[]; total: number }> {
    const params = new URLSearchParams();
    if (query.type) params.set('type', query.type);

    const response = await this.httpClient.get<
      { data: MobileCategoryItem[]; total: number } | MobileCategoryItem[]
    >(`/categories?${params.toString()}`, accessToken);

    if (Array.isArray(response)) {
      return { items: response, total: response.length };
    }
    return { items: response.data, total: response.total };
  }

  async create(
    accessToken: string,
    dto: CreateCategoryBffDto
  ): Promise<MobileCategoryItem> {
    return this.httpClient.post<MobileCategoryItem>(
      '/categories',
      dto,
      accessToken
    );
  }
}
