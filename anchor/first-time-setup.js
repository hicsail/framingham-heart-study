"use strict";
const Config = require("./config");
const Joi = require("joi");
const AnchorModels = require("./server/anchor/anchor-model");
const Mongodb = require("mongodb");
const Promptly = require("promptly");
const User = require("./server/models/user");
const PasswordComplexity = require("joi-password-complexity");
const Proposal = require("./server/models/proposal");

const main = async function () {
  const hapiAnchorModel = Config.get("/hapiAnchorModel");
  const defualtMongoURI =
    hapiAnchorModel.mongodb.connection.uri +
    hapiAnchorModel.mongodb.connection.db;
  const options = {
    default: defualtMongoURI,
  };

  const mongodbUri = await Promptly.prompt(
    `MongoDB URI: (${defualtMongoURI})`,
    options
  );
  const testMongo = await Mongodb.MongoClient.connect(mongodbUri, {});

  if (!testMongo) {
    console.error("Failed to connect to Mongodb.");
  }

  const rootEmail = await Promptly.prompt("Root user email:");
  const rootPassword = await Promptly.password("Root user password:");
  const complexityOptions = Config.get("/passwordComplexity");
  Joi.validate(rootPassword, new PasswordComplexity(complexityOptions));

  const connection = {
    uri: mongodbUri,
    db: `${hapiAnchorModel.mongodb.connection.db}`,
  };
  await AnchorModels.connect(connection, {});

  const userEmail = await User.findOne({ email: rootEmail });
  if (userEmail) {
    console.err(Error("Email is in use"));
  }
  const passwordHash = await User.generatePasswordHash(rootPassword);
  const document = {
    _id: User.ObjectId("000000000000000000000000"),
    name: "Root",
    password: passwordHash.hash,
    email: rootEmail.toLowerCase(),
    roles: {
      root: true,
    },
    timeCreated: new Date(),
  };
  await User.insertOne(document);

  await Proposal.populate();

  console.log("Setup complete.");
  process.exit(0);
};
main();
