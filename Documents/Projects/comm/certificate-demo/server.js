const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection using environment variable
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loler_certs';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Verification page (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/verify/:uuid', async (req, res) => {
  try {
    const Certificate = require('./models/Certificate');
    const cert = await Certificate.findOne({ uuid: req.params.uuid, status: 'active' });
    if (!cert) {
      return res.status(404).send('Certificate not found');
    }
    res.render('verify', { cert });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});