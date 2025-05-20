import { expect, use } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../index';

const chai = use(chaiHttp);

describe('app', function () {
  const originalUrl = 'https://example.com/';
  let shortCode: string;

  describe('POST /shorten', function () {
    it('Should return 201 when short code created successfully', async function () {
      const response = await chai.request(app).post('/shorten').send({
        url: originalUrl,
      });
      shortCode = response.body.data.shortCode;

      expect(response).to.have.status(201);
      expect(response.body.success).to.equal(true);
      expect(response.body.message).to.equal('Short Url created successfully');
      expect(response.body.data).to.have.property('shortCode');
    });

    it('Should return 400 when a valid url is not provided to create short code', async function () {
      const response = await chai.request(app).post('/shorten').send({
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
        .query({ code: shortCode });

      expect(response).to.have.status(200);
      expect(response.redirects).to.include(originalUrl);
    });

    it('Should return 404 when a short code does not exist', async function () {
      const response = await chai
        .request(app)
        .get(`/redirect`)
        .query({ code: 'random' });

      expect(response).to.have.status(404);
      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal('No url found');
    });

    it('Should return 200 when a short code is deleted successfully', async function () {
      const response = await chai
        .request(app)
        .delete(`/redirect`)
        .query({ code: shortCode });

      expect(response).to.have.status(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.message).to.equal(
        `short code ${shortCode} deleted sucessfully`
      );
      expect(response.body.data.original_url).to.equal(originalUrl);
    });
  });
});
