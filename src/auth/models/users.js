'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = (sequelize, DataTypes) => {
  const model = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false, },
    token: {
      type: DataTypes.VIRTUAL,
      get() {
        return jwt.sign(
          { username: this.username },
          process.env.SECRET,
          { expiresIn: '24h'}
        );
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
      console.log('---------- token: ', token);
      const parsedToken = jwt.verify(token, process.env.SECRET);
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
