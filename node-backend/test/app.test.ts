import { expect, use } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../index';
import prisma from '../prisma';

const chai = use(chaiHttp);

type BatchUrlResponseType = {
  url: string;
  shortCode?: string;
  success: boolean;
  message: string;
};

type User = { email: string; apiKey: string };

describe('app', function () {
  const originalUrl = 'https://example.com/';
  let shortCode: string;
  let apiKey: string;
  let testUser: User;
  let otherUser: User;
  let hobbyUser: User;
  const createdShortCodes: string[] = [];

  before(async function () {
    testUser = { email: 'testuser@example.com', apiKey: 'test-api-key-123' };
    hobbyUser = { email: 'hobby@example.com', apiKey: 'hobby-key' };

    await prisma.users.createMany({
      data: [
        {
          email: testUser.email,
          name: 'Test User',
          api_key: testUser.apiKey,
          tier: 'enterprise',
        },
        {
          email: hobbyUser.email,
          api_key: hobbyUser.apiKey,
          tier: 'hobby',
        },
      ],
    });

    apiKey = testUser.apiKey;
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
        email: {
          in: [testUser.email, otherUser.email, hobbyUser.email].filter(
            Boolean
          ),
        },
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

    it('Short code cannot be created if the provided custom short code already exists', async function () {
      const customShortCode = 'f7MlP';

      const response = await chai
        .request(app)
        .post('/shorten')
        .set('x-api-key', apiKey)
        .send({
          url: originalUrl,
          code: customShortCode,
        });

      expect(response).to.have.status(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal(
        `${customShortCode} already exists. Please try again with another code.`
      );
      expect(response.body.data).to.equal(null);
    });

    it('Should create short URLs for valid input in batch', async function () {
      const urls = ['https://example.com/page1', 'https://example.com/page2'];

      const res = await chai
        .request(app)
        .post('/shorten/batch')
        .set('x-api-key', apiKey)
        .send({ urls });

      expect(res).to.have.status(207);
      expect(res.body.success).to.equal(true);
      expect(res.body.data.length).to.equal(2);
      res.body.data.forEach((item: BatchUrlResponseType) => {
        createdShortCodes.push(item.shortCode!);
        expect(item.success).to.equal(true);
        expect(item.message).to.match(/successfully/i);
      });
    });

    it('should handle invalid URLs gracefully in batch', async () => {
      const urls = ['https://valid.com', '', null];

      const res = await chai
        .request(app)
        .post('/shorten/batch')
        .set('x-api-key', apiKey)
        .send({ urls });

      expect(res).to.have.status(207);
      expect(res.body.success).to.equal(true);
      expect(res.body.data.length).to.equal(3);

      const failed = res.body.data.filter(
        (r: BatchUrlResponseType) => !r.success
      );
      const passed = res.body.data.filter(
        (r: BatchUrlResponseType) => r.success
      );

      passed.forEach((item: BatchUrlResponseType) =>
        createdShortCodes.push(item.shortCode!)
      );

      expect(failed.length).to.equal(2);
      expect(passed.length).to.equal(1);

      failed.forEach((item: BatchUrlResponseType) => {
        expect(item.message).to.match(/missing/i);
      });
    });

    it('Should deny access to hobby tier users to create short urls in batch', async () => {
      const res = await chai
        .request(app)
        .post('/shorten/batch')
        .set('x-api-key', 'hobby-key')
        .send({ urls: ['https://example.com'] });

      expect(res).to.have.status(403);
      expect(res.body.success).to.equal(false);
      expect(res.body.message).to.equal(
        'Bulk URL shortening is only available for enterprise users.'
      );
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
      otherUser = {
        email: 'another@example.com',
        apiKey: 'another-api-key-456',
      };
      await prisma.users.create({
        data: {
          email: otherUser.email,
          api_key: otherUser.apiKey,
        },
      });

      const response = await chai
        .request(app)
        .patch(`/redirect`)
        .set('x-api-key', otherUser.apiKey)
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

    it('Should update expiry date successfully to make a short code inactive', async () => {
      const res = await chai
        .request(app)
        .patch(`/shorten/${shortCode}`)
        .set('x-api-key', apiKey)
        .send({ expiryDate: '30-03-2025' });

      expect(res).to.have.status(200);
      expect(res.body.success).to.equal(true);
      expect(res.body.message).to.equal(
        'Expiry date updated to make short code inactive'
      );
      expect(res.body.data.shortCode).to.equal(shortCode);
    });
  });
});
