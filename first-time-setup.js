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

  // create coordinator
  const userPwdHash = await User.generatePasswordHash("123123");
  const coordinator = {
    _id: User.ObjectId("100000000000000000000000"),
    name: "The Coordinator",
    password: userPwdHash.hash,
    email: "coor@mail.com",
    roles: {
      coordinator: true,
    },
    timeCreated: new Date(),
  };
  await User.insertOne(coordinator);

  // populate reviewers
  const reviewers = [
    {
      _id: User.ObjectId("200000000000000000000000"),
      name: "review user0",
      password: userPwdHash.hash,
      email: "review0@mail.com",
      roles: {
        reviewer: true,
      },
      timeCreated: new Date(),
    },
    {
      _id: User.ObjectId("200000000000000000000001"),
      name: "review user1",
      password: userPwdHash.hash,
      email: "review1@mail.com",
      roles: {
        reviewer: true,
      },
      timeCreated: new Date(),
    },
    {
      _id: User.ObjectId("200000000000000000000002"),
      name: "review user2",
      password: userPwdHash.hash,
      email: "review2@mail.com",
      roles: {
        reviewer: true,
      },
      timeCreated: new Date(),
    },
    {
      _id: User.ObjectId("200000000000000000000003"),
      name: "review user3",
      password: userPwdHash.hash,
      email: "review3@mail.com",
      roles: {
        reviewer: true,
      },
      timeCreated: new Date(),
    },
  ];
  await User.insertMany(reviewers);

  // populate proposals
  const proposals = [];
  for (let idx = 0; idx < 15; idx++) {
    const proposal = {
      groupId: "group0",
      fileName: `proposal_${idx}.pdf`,
      userId: "100000000000000000000000",
      feasibilityReviewerId: null,
      reviewerIds: [],
      feasibilityStatus: Proposal.status.PENDING,
      createdAt: new Date(),
      feasibilityReviewDate: null,
    };

    if (idx > 5) {
      if (idx % 2 === 0) {
        proposal.reviewerIds.push("200000000000000000000000");
      }
      if (idx % 2 !== 0) {
        proposal.reviewerIds.push("200000000000000000000001");
      }
      if (idx % 3 === 0) {
        proposal.reviewerIds.push("200000000000000000000002");
      }
      if (idx % 5 === 0) {
        proposal.reviewerIds.push("200000000000000000000003");
      }

      if (proposal.reviewerIds.length > 0) {
        proposal.feasibilityStatus = Proposal.status.APPROVED;
        proposal.feasibilityReviewerId = "100000000000000000000000";
        proposal.feasibilityReviewDate = new Date();
      }
    }

    proposals.push(proposal);
  }

  await Proposal.insertMany(proposals);

  console.log("Setup complete.");
  process.exit(0);
};
main();
