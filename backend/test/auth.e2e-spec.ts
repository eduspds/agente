import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Testes de integração de autenticação
// Requer banco de dados e Redis em execução (ou usar TestContainers)
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('deve retornar tokens com credenciais válidas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@leadwatch.com',
          password: 'Admin@123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        email: 'admin@leadwatch.com',
        role: 'ADMIN',
      });
    });

    it('deve retornar 401 com credenciais inválidas', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@leadwatch.com',
          password: 'SenhaErrada',
        })
        .expect(401);
    });

    it('deve retornar 400 com email inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'email-invalido',
          password: 'qualquer',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/leads (rota protegida)', () => {
    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/leads')
        .expect(401);
    });

    it('deve retornar 200 com token válido', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@leadwatch.com', password: 'Admin@123' });

      const { accessToken, user } = loginResponse.body;

      await request(app.getHttpServer())
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Tenant-ID', user.tenantId)
        .expect(200);
    });
  });
});
