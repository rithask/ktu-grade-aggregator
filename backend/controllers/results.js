const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const resultsRouter = require("express").Router();
const { extractBatch, cleanData, cleanSupplyData } = require("../utils/helper");
const RESULT_URL = require("../utils/config").RESULT_URL;
const { AllResults, ExamDefId } = require("./mongo");

resultsRouter.post("/", async (request, response) => {
  const { registerNo, dob } = request.body;
  if (
    registerNo === "" ||
    registerNo === undefined ||
    dob === "" ||
    dob === undefined
  ) {
    return response
      .status(400)
      .json({ error: "register number or dob missing" });
  }
  const batchYear = extractBatch(registerNo);
  if (batchYear === undefined || !batchYear) {
    return response.status(400).json({ error: "invalid register number" });
  }

  try {
    const examDefIds = await ExamDefId.findOne({ batchYear });
    const allExamDefIds = await AllResults.find({ program: "B.Tech" });
    if (examDefIds === null) {
      return response.status(400).json({ error: "no data found" });
    } else {
      const results = [];
      for (const id of examDefIds.examDefId) {
        try {
          const body = {
            registerNo,
            dateOfBirth: dob,
            examDefId: String(id),
            schemeId: "1",
          };
          const apiResponse = await fetch(RESULT_URL, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          });
          const data = await apiResponse.json();

          if (apiResponse.status === 200) {
            results.push(data);
          }
        } catch (error) {
          console.log(error);
        }
      }
      results.length === 0 &&
        response.status(400).json({ error: "no data found" });
      const cleanedData = cleanData(results, allExamDefIds);
      response.json(cleanedData);
    }
  } catch (error) {
    console.log(error);
  }
});

resultsRouter.post("/update", async (request, response) => {
  const { registerNo, dob, semester, examDefId, oldResult } = request.body;
  if (registerNo === "" || registerNo === undefined) {
    return response.status(400).json({ error: "register number is missing" });
  }
  if (dob === "" || dob === undefined) {
    return response.status(400).json({ error: "dob is missing" });
  }
  if (semester === "" || semester === undefined) {
    return response.status(400).json({ error: "semester is missing" });
  }
  if (examDefId === "" || examDefId === undefined) {
    return response.status(400).json({ error: "examDefId is missing" });
  }
  if (oldResult === "" || oldResult === undefined) {
    return response.status(400).json({ error: "oldResult is missing" });
  }

  semester === "S1" || semester === "S2"
    ? (updatedSemester = "S1/S2")
    : (updatedSemester = semester);
  var fetchedExamDefIds = await AllResults.findOne({
    semester: updatedSemester,
    program: "B.Tech",
  });
  var cleanedData = "";
  for (const id of fetchedExamDefIds.examDefId) {
    if (id > examDefId) {
      try {
        const body = {
          registerNo: registerNo,
          dateOfBirth: dob,
          examDefId: String(id),
          schemeId: "1",
        };
        const apiResponse = await fetch(RESULT_URL, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const data = await apiResponse.json();
        if (apiResponse.status === 200) {
          cleanedData = cleanSupplyData(data, oldResult);
        } else {
          // response.status(400).json({ error: 'no data found' })
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  if (cleanedData === "") {
    return response.status(400).json({ error: "no data found" });
  } else {
    response.status(200).json(cleanedData);
  }
});

module.exports = resultsRouter;
