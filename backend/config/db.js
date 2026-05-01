const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const keyBase64 = process.env.MONGODB_ENCRYPTION_KEY;
    
    // AutoEncryption config if key is provided
    let autoEncryption;
    if (keyBase64) {
      const kmsProviders = {
        local: {
          key: Buffer.from(keyBase64, 'base64')
        }
      };

      // In a full production setup, you would define a schemaMap here
      // specifying which fields are encrypted. For MVP, we provide the 
      // configuration structure to enable CSFLE.
      autoEncryption = {
        keyVaultNamespace: 'encryption.__keyVault',
        kmsProviders,
        extraOptions: {
          cryptSharedLibRequired: false
        }
      };
    }

    const options = autoEncryption ? { autoEncryption } : {};

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
