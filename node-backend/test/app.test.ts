import { expect, use } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../index';
import prisma from '../prisma';

const chai = use(chaiHttp);

describe('app', function () {
  const originalUrl = 'https://example.com/';
  let shortCode: string;
  let apiKey: string;
  let testUserId: number;
  let otherUserId: number;
  const createdShortCodes: string[] = [];

  before(async function () {
    const testUser = await prisma.users.create({
      data: {
        email: 'testuser@example.com',
        name: 'Test User',
        api_key: 'test-api-key-123',
      },
    });

    testUserId = testUser.id;
    apiKey = testUser.api_key;
  });

  after(async function () {
    if (createdShortCodes.length > 0) {
      await prisma.shortened_urls.deleteMany({
        where: {
          short_code: { in: createdShortCodes },
        },
      });
    }

    await prisma.users.deleteMany({
      where: {
        id: { in: [testUserId, otherUserId].filter(Boolean) },
      },
    });
  });

  describe('POST /shorten', function () {
    it('Short code created successfully', async function () {
      const response = await chai
        .request(app)
        .post('/shorten')
        .set('x-api-key', apiKey)
        .send({
          url: originalUrl,
        });
      shortCode = response.body.data.shortCode;
      createdShortCodes.push(shortCode);

      expect(response).to.have.status(201);
      expect(response.body.success).to.equal(true);
      expect(response.body.message).to.equal('Short Url created successfully');
      expect(response.body.data).to.have.property('shortCode');
    });

    it('Short code cannot be created when api key is not present in header', async function () {
      const response = await chai.request(app).post('/shorten').send({
        url: originalUrl,
      });

      expect(response).to.not.have.header('x-api-key', apiKey);
      expect(response).to.have.status(401);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('Missing API key');
      expect(response.body.data).to.equal(null);
    });

    it('Short code cannot be created when invalid api key is passed in header', async function () {
      const response = await chai
        .request(app)
        .post('/shorten')
        .set('x-api-key', 'random-api-key')
        .send({
          url: originalUrl,
        });

      expect(response).to.have.status(403);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('Invalid API key');
      expect(response.body.data).to.equal(null);
    });

    it('Short code cannot be created when a valid url is not provided to create short code', async function () {
      const response = await chai
        .request(app)
        .post('/shorten')
        .set('x-api-key', apiKey)
        .send({
          url: '',
        });

      expect(response).to.have.status(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('Please provide a valid url');
      expect(response.body.data).to.equal(null);
    });

    it('Should redirect to the original URL when a valid short code is provided', async function () {
      const response = await chai
        .request(app)
        .get(`/redirect`)
        .set('x-api-key', apiKey)
        .query({ code: shortCode });

      expect(response).to.have.status(200);
      expect(response.redirects).to.include(originalUrl);
    });

    it('Should not redirect when a short code does not exist', async function () {
      const response = await chai
        .request(app)
        .get(`/redirect`)
        .set('x-api-key', apiKey)
        .query({ code: 'random' });

      expect(response).to.have.status(404);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('No url found');
    });

    it('Should not redirect if the url has expired', async function () {
      const url = await chai
        .request(app)
        .post('/shorten')
        .set('x-api-key', apiKey)
        .send({ url: 'https://expired-url.com', expiryDate: '20-05-2025' });

      console.log('first', url);
      const expiredShortCode = url.body.data.shortCode;
      createdShortCodes.push(expiredShortCode);

      const response = await chai
        .request(app)
        .get(`/redirect`)
        .set('x-api-key', apiKey)
        .query({ code: expiredShortCode });

      expect(response).to.have.status(410);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('Url has expired');
    });

    it('Short code cannnot be deleted when no url is found for the given short code', async function () {
      const randomShortCode = 'randomShortCode';

      const response = await chai
        .request(app)
        .patch(`/redirect`)
        .set('x-api-key', apiKey)
        .query({ code: randomShortCode });

      expect(response).to.have.status(404);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal(
        `No URL found for the short code ${randomShortCode}`
      );
    });

    it('Short code cannnot be deleted when user does not own the given short code', async function () {
      const otherUser = await prisma.users.create({
        data: {
          email: 'another@example.com',
          api_key: 'another-api-key-456',
        },
      });
      otherUserId = otherUser.id;

      const response = await chai
        .request(app)
        .patch(`/redirect`)
        .set('x-api-key', otherUser.api_key)
        .query({ code: shortCode });

      expect(response).to.have.status(403);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal(`You do not own this short code`);
    });

    it('Should return 200 when a short code is deleted successfully', async function () {
      const response = await chai
        .request(app)
        .patch(`/redirect`)
        .set('x-api-key', apiKey)
        .query({ code: shortCode });

      expect(response).to.have.status(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.message).to.equal(
        `short code ${shortCode} deleted sucessfully`
      );
    });
  });
});
