'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cryptoJS = require('crypto-js/sha256');

const userSchema = (sequelize, DataTypes) => {
  const model = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false, },
    token: {
      type: DataTypes.VIRTUAL,
      get() {
        const token =  jwt.sign(
          { username: this.username },
          process.env.SECRET,
          { expiresIn: '15m'}
        );
        // return token;
        const encryptedToken = cryptoJS.SHA256.encrypt(JSON.stringify(token), process.env.SECRET);
        console.log('---------- sending ecrypted token: ', encryptedToken);
        return encryptedToken;
      }
    }
  });

  model.beforeCreate(async (user) => {
    console.log(user);
    let hashedPass = await bcrypt.hash(user.password, 10);
    user.password = hashedPass;
  });

  // Basic AUTH: Validating strings (username, password) 
  model.authenticateBasic = async function (username, password) {
    console.log(username, password);
    const user = await this.findOne({ where: { username } });
    if (!user) {
      console.log('Not found!');
    }
    const valid = await bcrypt.compare(password, user.dataValues.password);
    if (valid) { return user; }
    throw new Error('Invalid User');
  }

  // Bearer AUTH: Validating a token
  model.authenticateToken = async function (token) {
    try {
      console.log('---------- encrypted token: ', encryptedToken);
      const decryptedToken = cryptoJS.SHA256.decrypt(JSON.parse(token), process.env.SECRET);
      console.log('---------- decrypted token: ', decryptedToken);
      const parsedToken = jwt.verify(decryptedToken, process.env.SECRET);
      // const parsedToken = jwt.verify(token, process.env.SECRET);
      console.log('---------- parsedToken: ', parsedToken);
      const user = await this.findOne({ where: { username: parsedToken.username } })
      if (user) { return user; }
      throw new Error("User Not Found");
    } catch (e) {
      throw new Error(e.message)
    }
  }

  return model;
}

module.exports = userSchema;
