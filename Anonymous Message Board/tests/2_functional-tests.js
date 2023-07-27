const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', async function() {
  const board = 'test_board';
  const text = 'Some reply text';
  const delete_password = 'password';

  let thread_id = 'id here'
  let reply_id = 'id here'
  
  before(async function () {
    this.timeout(5000);
    // Create a new thread
    const newThread = await chai.request(server)
      .post(`/api/threads/${board}`)
      .send({
        board: board,
        text: text,
        delete_password: delete_password,
      });
    
    assert.equal(newThread.status, 200);

    const threadResponse = await chai.request(server)
      .get(`/api/threads/${board}`)
    
    thread_id = threadResponse.body[0]._id;

    // Create a new reply
    const newReply = await chai.request(server)
      .post(`/api/replies/${board}`)
      .send({
        board: board,
        thread_id: thread_id,
        text: text,
        delete_password: delete_password,
      });
    assert.equal(newReply.status, 200);

    const replyResponse = await chai.request(server)
      .get(`/api/replies/${board}?thread_id=${thread_id}`)
  
    reply_id = replyResponse.body.replies[0]._id;
  });
  
  test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post(`/api/threads/${board}`)
      .send({
        board: board,
        text: text,
        delete_password: delete_password,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
      })
    done();
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post(`/api/replies/${board}`)
      .send({
        thread_id: thread_id,
        text: text,
        delete_password: delete_password,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
      })
    done();
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get(`/api/threads/${board}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, "response should be an array");
        assert.property(res.body[0], 'text', "response should contain text");
        assert.notProperty(res.body[0], 'delete_password', "response should not contain delete_password");
        assert.notProperty(res.body[0], 'reported', "response should not contain reported field");
      })
    done();
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get(`/api/replies/${board}?thread_id=${thread_id}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.replies, "response should be an array");
      })
    done();
  });
  
  test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .put(`/api/threads/${board}`)
      .send({
        thread_id: thread_id,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
      })
    done();
  });
  
  test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
     chai.request(server)
      .put(`/api/replies/${board}`)
      .send({
        reply_id: reply_id,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
      })
    done();
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({
        reply_id: reply_id,
        delete_password: 'incorrect_password',
      })
      .end(function (err, res) {
        assert.equal(res.text, "incorrect password");
      })
    done();
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({
        reply_id: reply_id,
        delete_password: delete_password,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
      })
    done();
  });

  
  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({
        thread_id: thread_id,
        delete_password: 'incorrect_password',
      })
      .end(function (err, res) {
        assert.equal(res.text, "incorrect password");
      })
    done();
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function (done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({
        thread_id: thread_id,
        delete_password: delete_password,
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "success");
      })
    done();
  });
  
  after(function() {
     chai.request(server).get('/api');
   });
  
});
