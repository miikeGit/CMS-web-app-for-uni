const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Замініть на ваш рядок підключення до MongoDB
        const conn = await mongoose.connect('mongodb://localhost:27017/pvi_chat_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true, // Може бути застарілим, перевірте версію Mongoose
            // useFindAndModify: false // Може бути застарілим
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Вихід з процесу при помилці підключення
    }
};

module.exports = connectDB;