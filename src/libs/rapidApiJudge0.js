import axios from "axios";
import { myEnvironment } from "../config/env.js";

// Language ID map
const languageMap = {
  PYTHON: 109,
  JAVA: 91,
  JAVASCRIPT: 102,
  CPP: 105,
};

// Get Judge0 language ID
export const getJudge0LanguageId = (language) => {
  return languageMap[language.toUpperCase()];
};

// Get readable language name from Judge0 ID
export const getLanguageName = (languageId) => {
  const reverseMap = Object.entries(languageMap).reduce((acc, [key, val]) => {
    acc[val] = key.toLowerCase();
    return acc;
  }, {});
  return reverseMap[languageId] || "unknown";
};

// Sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// API headers
const headers = {
  "x-rapidapi-key": myEnvironment.RAPIDAPI_KEY,
  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
  "Content-Type": "application/json",
};

// Submit a batch of submissions
export const submitBatch = async (submissions) => {
  
  const url = `https://judge0-ce.p.rapidapi.com/submissions/batch?base64_encoded=false`;
  try {
    const { data } = await axios.post(url, { submissions }, { headers });
    console.log("Submission result:", data);
    return data;
  } catch (error) {
    console.error("Error submitting batch:", error.response?.data || error);
    throw error;
  }
};

// Poll for batch results using tokens
export const pollBatchResults = async (tokens) => {
  const url = `https://judge0-ce.p.rapidapi.com/submissions/batch`;
  try {
    while (true) {
      const res = await axios.get(url, {
        headers,
        params: {
          tokens: tokens.join(","),
          base64_encoded: "false",
        },
      });
console.log(res)
      const results = res.data.submissions;
      console.log(results)
      const isAllDone = results.every(
        (result) => result.status.id !== 1 && result.status.id !== 2
      );

      if (isAllDone) {
        return results;
      }

      await sleep(1000);
    }
  } catch (error) {
    console.error("Error polling results:", error.response?.data || error);
    throw error;
  }
};
