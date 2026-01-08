import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { randomUUID } from 'node:crypto';

/**
 * Dados para criar tag de teste
 */
export interface CreateTagData {
  name?: string;
  color?: string;
  organizationId: string;
}

/**
 * Factory para criar tags de teste
 */
export class TagFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma tag de teste
   */
  async create(data: CreateTagData) {
    return this.prisma.tag.create({
      data: {
        id: randomUUID(),
        name: data.name || `Tag ${randomUUID().substring(0, 8)}`,
        color: data.color || this.generateRandomColor(),
        organizationId: data.organizationId,
      },
    });
  }

  /**
   * Cria múltiplas tags
   */
  async createMany(count: number, data: CreateTagData) {
    const tags = [];

    for (let i = 0; i < count; i++) {
      const tag = await this.create({
        ...data,
        name: data.name || `Tag ${i + 1}`,
      });
      tags.push(tag);
    }

    return tags;
  }

  /**
   * Gera cor hexadecimal aleatória
   */
  private generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}
