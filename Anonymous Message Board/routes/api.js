'use strict';
const mongoose = require('mongoose');
const crypto = require('crypto');

mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const threadSchema = new mongoose.Schema({
  text: { type: String },
  created_on: { type: Date },
  bumped_on: { type: Date },
  reported: { type: Boolean, default: false},
  delete_password: { type: String, required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
});

const replySchema = new mongoose.Schema({
  text: { type: String },
  created_on: { type: Date },
  reported: { type: Boolean},
  delete_password: { type: String },
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
});

const Board = mongoose.model('Board', boardSchema);
const Thread = mongoose.model('Thread', threadSchema);
const Reply = mongoose.model('Reply', replySchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    
    // View threads: GET request to /api/threads/{board}
    .get(async function(req, res) {
      const board = req.params.board;
      try {
        const boardEntry = await Board.findOne({ name: board });
        
        if (!boardEntry) {
          return res.status(404).json({ error: 'Board not found' });
        };
        
        const threads = await Thread.find({ board: boardEntry._id })
          .sort({ bumped_on: -1 })
          .limit(10)

        const threadsWithReplies = await Promise.all(
          threads.map(async (thread) => {
            const replies = await Reply.find({ thread: thread._id })
              .sort({ created_on: -1 })
              .limit(3);

            // Remove 'reported' and 'delete_password' fields from ach reply
            const sanitizedReplies = replies.map(({ _id, text, created_on }) => ({
              _id,
              text,
              created_on
            }));
  
            return {
              _id: thread._id,
              text: thread.text,
              created_on: thread.created_on,
              bumped_on: thread.bumped_on,
              replies: sanitizedReplies
            };
          })
        );
        res.json(threadsWithReplies);
      } catch (error) {
        console.error('Error occurred in GET request to /api/threads/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while retrieving threads' });
      };
    })
    
    // Create a new thread: POST request to /api/threads/{board}
    .post(async function(req, res) {
      const board = req.params.board || 'general';
      const text = req.body.text;
      
      const hash = crypto.createHash('sha256');
      hash.update(req.body.delete_password);
      const delete_password = hash.digest('hex');
      
      try {
        // Find existing board or create new one
        const boardEntry = await Board.findOneAndUpdate(
          { name: board },
          { name: board },
          { upsert: true, new: true }
        );
        // Make new thread
        const creationData = new Date();
        const newThreadEntry = new Thread({
          text: text,
          created_on: creationData,
          bumped_on: creationData,
          delete_password: delete_password,
          board: boardEntry._id,
        })        
        const createdThread = await newThreadEntry.save();
        res.redirect(`/b/${board}?_id=${createdThread._id}`);
      } catch (error) {
        console.error('Error occurred in POST request to /api/threads/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while creating new thread.' });
      };
    })
    
    // Report a thread: PUT request to /api/threads/{board}
    .put(async function(req, res) {
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      try {
        const updateResult = await Thread.findByIdAndUpdate(
          thread_id,
          { $set: { reported: true } }
        );
        
        if (!updateResult) {
          return res.status(404).json({ error: 'Thread not found' });
        };
        
      } catch (error) {
        console.error('Error occurred in PUT request to /api/threads/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while reporting the thread' });
      };

       res.send('reported');
    })
    
    // Delete a thread: DELETE request to /api/threads/{board}
    .delete(async function(req, res) {
      const board = req.body.board;
      const thread_id = req.body.thread_id;
      
      const hash = crypto.createHash('sha256');
      hash.update(req.body.delete_password);
      const delete_password = hash.digest('hex');
      
      try {
        const thread = await Thread.findById(thread_id);

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        };

        if(delete_password !== thread.delete_password) {
           return res.send('incorrect password');
        }; 
        
        await Thread.deleteOne({ _id: thread_id });
        //await Reply.deleteMany({ thread: thread_id });
      } catch (error) {
        console.error('Error occurred in DELETE request to /api/threads/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while deleting the thread.' });
      }
      
      res.send('success');
    })
    
  app.route('/api/replies/:board')
    // View a single thread with all replies: GET request to /api/replies/{board}
    .get(async function(req, res) {
      // const board = req.params.board;
      const thread_id = req.query.thread_id

      try {
        // Find the thread by its thread_id
        const thread = await Thread.findById(thread_id);
    
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        };

        // Get all replies associated with the thread
        const replies = await Reply.find({ thread: thread_id })
          .sort({ created_on: -1 });

        // Remove 'reported' and 'delete_password' fields from ach reply
        const sanitizedReplies = replies.map(({ _id, text, created_on }) => ({
          _id,
          text,
          created_on
        }));
  
        res.json({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: sanitizedReplies
        });
        
      } catch (error) {
        console.error('Error occurred in GET request to /api/replies/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while retrieving the thread' });
      };
    })
    
    // Create a new reply: POST request to /api/replies/{board}
    .post(async function(req, res) {
      const request_date = new Date();
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const text = req.body.text;
      
      const hash = crypto.createHash('sha256');
      hash.update(req.body.delete_password);
      const delete_password = hash.digest('hex');
      
      try {
        // Find existing board or create new one
        const boardEntry = await Board.findOneAndUpdate(
          { name: board },
          { name: board },
          { upsert: true, new: true }
        );

        // Find the thread by its thread_id
        const thread = await Thread.findById(thread_id);
        thread.bumped_on = request_date;
        await thread.save();
    
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }
        
        // Make new reply
        const newReplyEntry = new Reply({
          text: text,
          created_on: request_date,
          delete_password: delete_password,
          thread: thread_id,
        });

        const createdReply = await newReplyEntry.save();

        res.redirect(`/b/${board}?_id=${thread_id}`);
      } catch (error) {
        console.error('Error occurred in POST request to /api/replies/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while creating new Reply.' });
      };
    })

    // Report a reply: PUT request to /api/replies/{board}
    .put(async function(req, res) {
      // const board = req.params.board;
      // const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      
      try {
        // Find and update reply entry
        const updateResult = await Reply.findByIdAndUpdate(
          reply_id,
          { $set: { reported: true } }
        );
        
        if (!updateResult) {
          return res.status(404).json({ error: 'Reply not found' });
        };
        
      } catch (error) {
        console.error('Error occurred in PUT request to /api/replies/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while reporting the reply' });
      };

       res.send('reported');
    })
      
    // Delete a reply: DELETE request to /api/replies/{board}
    .delete(async function(req, res) {
      // const board = req.params.board;
      // const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;

      const hash = crypto.createHash('sha256');
      hash.update(req.body.delete_password);
      const delete_password = hash.digest('hex');
      
      try {
        // Find and delete reply entry
        const replyToDelete = await Reply.findById(reply_id);

        if (!replyToDelete) {
          return res.json({ _id: reply_id, message: "Not found" });
        };

        if(delete_password !== replyToDelete.delete_password) {
          return res.send("incorrect password");
        }; 
        
        replyToDelete.text = "[deleted]";
        await replyToDelete.save();
      } catch (error) {
        console.error('Error occurred in DELETE request to /api/replies/{board}:', error.message);
        res.status(500).json({ error: 'An error occurred while deleting the reply.' });
      }
      
      res.send('success');
    })

};
