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

    it('Should redirect to the original URL when a valid short code is provided', async function () {
      const response = await chai
        .request(app)
        .get(`/redirect`)
        .query({ code: shortCode });

      expect(response).to.have.status(200);
      expect(response.redirects).to.include(originalUrl);
    });
  });
});
