import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVisitSurveyAnswers,
  canonicalBoothName,
  isTrainingCentre,
  servicesForBooth
} from "../src/boothSurvey.js";

test("booth aliases resolve to the configured institution", () => {
  assert.equal(canonicalBoothName("BODI YA MIKOPO"), "HESLB");
  assert.ok(servicesForBooth("BODI YA MIKOPO").includes("Uombaji wa mkopo"));
  assert.equal(isTrainingCentre("training centre"), true);
});

test("canonical survey answers keep free-text fields separate", () => {
  const answers = buildVisitSurveyAnswers({
    surveyStatus: "completed",
    purpose: "question",
    service: "Usajili wa TIN",
    satisfaction: 3,
    question: "Ninawezaje kupata TIN?",
    newInfo: "Huduma ipo mtandaoni"
  });

  assert.equal(answers.find((answer) => answer.id === "question").answer, "Ninawezaje kupata TIN?");
  assert.equal(answers.find((answer) => answer.id === "newInfo").answer, "Huduma ipo mtandaoni");
});
