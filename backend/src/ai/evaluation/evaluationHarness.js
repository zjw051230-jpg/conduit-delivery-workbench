const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_FIXTURE_ROOT = path.resolve(
  __dirname,
  "../../../../fixtures/competitions/demo-text-classification",
);
const LABELS = ["positive", "negative", "neutral"];
const METHOD_METADATA = {
  baseline: {
    id: "baseline-keyword-rule",
    name: "Baseline keyword rule",
    description: "Matches a short seed list of positive and negative sentiment keywords.",
  },
  improved: {
    id: "improved-keyword-rule",
    name: "Improved keyword rule",
    description: "Extends the baseline with failure-mode keywords found in dev errors.",
  },
};
const FIXTURE_METADATA = {
  id: "demo-text-classification",
  name: "Demo Text Classification",
  taskType: "single-label text classification",
  scoringMetric: "accuracy",
  inputFormat: { id: "string", text: "string" },
  outputFormat: { id: "string", label: "positive | negative | neutral" },
  labels: LABELS,
  methods: METHOD_METADATA,
};

const baselineKeywords = {
  positive: ["love", "fast", "great", "excellent"],
  negative: ["crash", "bug", "broken", "bad"],
};

const improvedKeywords = {
  positive: [...baselineKeywords.positive, "clear", "helpful", "stable"],
  negative: [...baselineKeywords.negative, "slow", "confusing", "frustrating"],
};

function loadCompetitionFixture(fixtureRoot = DEFAULT_FIXTURE_ROOT) {
  const train = readJsonl(path.join(fixtureRoot, "train.jsonl"));
  const dev = readJsonl(path.join(fixtureRoot, "dev.jsonl"));

  return {
    ...FIXTURE_METADATA,
    train,
    dev,
    fixtureRoot,
  };
}

function runBaseline(fixture = loadCompetitionFixture()) {
  return runKeywordMethod({
    fixture,
    method: METHOD_METADATA.baseline,
    keywords: baselineKeywords,
  });
}

function runImprovedMethod(fixture = loadCompetitionFixture()) {
  return runKeywordMethod({
    fixture,
    method: METHOD_METADATA.improved,
    keywords: improvedKeywords,
  });
}

function scorePredictions(samples, predictions) {
  const predictionById = new Map(predictions.map((prediction) => [prediction.id, prediction.label || prediction.prediction]));
  const confusionMatrix = createConfusionMatrix(samples, predictions);
  const failedExamples = [];
  let correct = 0;

  for (const sample of samples) {
    const prediction = predictionById.get(sample.id) || "__missing__";
    ensureMatrixCell(confusionMatrix, sample.label, prediction);
    confusionMatrix[sample.label][prediction] += 1;

    if (prediction === sample.label) {
      correct += 1;
    } else {
      failedExamples.push({
        id: sample.id,
        text: sample.text,
        label: sample.label,
        prediction,
      });
    }
  }

  return {
    total: samples.length,
    correct,
    accuracy: samples.length === 0 ? 0 : roundMetric(correct / samples.length),
    confusionMatrix,
    failedExamples,
  };
}

function buildAblationTable({ baseline, improved }) {
  const baselineAccuracy = baseline.score.accuracy;
  const improvedAccuracy = improved.score.accuracy;

  return {
    metric: "accuracy",
    rows: [
      {
        methodId: baseline.method.id,
        methodName: baseline.method.name,
        accuracy: baselineAccuracy,
        correct: baseline.score.correct,
        total: baseline.score.total,
        deltaFromBaseline: 0,
      },
      {
        methodId: improved.method.id,
        methodName: improved.method.name,
        accuracy: improvedAccuracy,
        correct: improved.score.correct,
        total: improved.score.total,
        deltaFromBaseline: roundMetric(improvedAccuracy - baselineAccuracy),
      },
    ],
    bestMethodId: improvedAccuracy >= baselineAccuracy ? improved.method.id : baseline.method.id,
  };
}

function buildErrorAnalysis({ baseline, improved }) {
  const improvedFailures = new Set(improved.score.failedExamples.map((example) => example.id));
  const resolvedByImproved = baseline.score.failedExamples
    .filter((example) => !improvedFailures.has(example.id))
    .map((example) => ({
      id: example.id,
      label: example.label,
      baselinePrediction: example.prediction,
      improvedPrediction: improved.predictions.find((prediction) => prediction.id === example.id)?.label,
    }));

  return {
    baseline: {
      failedCount: baseline.score.failedExamples.length,
      failedExamples: baseline.score.failedExamples,
    },
    improved: {
      failedCount: improved.score.failedExamples.length,
      failedExamples: improved.score.failedExamples,
    },
    resolvedByImproved,
    summary: `${resolvedByImproved.length} baseline errors were fixed by the improved keyword set.`,
  };
}

function buildCompetitionBrief(fixture) {
  return {
    competitionId: fixture.id,
    competitionName: fixture.name,
    taskType: fixture.taskType,
    labels: fixture.labels,
    scoringMetric: fixture.scoringMetric,
    inputFormat: fixture.inputFormat,
    outputFormat: fixture.outputFormat,
    trainSize: fixture.train.length,
    devSize: fixture.dev.length,
    baselineMethodName: fixture.methods.baseline.name,
    improvedMethodName: fixture.methods.improved.name,
    summary: `${fixture.name} is a ${fixture.taskType} demo scored by ${fixture.scoringMetric}.`,
  };
}

function buildMetricAnalysis(fixture, scoringResult) {
  return {
    metric: fixture.scoringMetric,
    direction: "maximize",
    scores: {
      baseline: scoringResult.baseline.score,
      improved: scoringResult.improved.score,
    },
    risks: [
      "Small dev split means every sample changes accuracy by 0.2.",
      "Keyword rules can overfit visible wording and miss synonyms.",
    ],
    interpretation: `${scoringResult.improved.method.name} improves accuracy from ${scoringResult.baseline.score.accuracy} to ${scoringResult.improved.score.accuracy}.`,
  };
}

function buildDataProfile(fixture) {
  return {
    competitionId: fixture.id,
    trainSize: fixture.train.length,
    devSize: fixture.dev.length,
    labels: fixture.labels,
    labelDistribution: {
      train: countLabels(fixture.train, fixture.labels),
      dev: countLabels(fixture.dev, fixture.labels),
    },
    inputFormat: fixture.inputFormat,
    outputFormat: fixture.outputFormat,
  };
}

function buildWeaknessDiagnosis(baselineResult, errorAnalysis) {
  const failedExampleIds = errorAnalysis.baseline.failedExamples.map((example) => example.id);
  const missedLabels = unique(errorAnalysis.baseline.failedExamples.map((example) => example.label));

  return {
    methodId: baselineResult.method.id,
    failedCount: errorAnalysis.baseline.failedCount,
    failedExampleIds,
    missedLabels,
    weaknesses: [
      {
        id: "keyword coverage gap",
        description: "Baseline seed keywords miss sentiment words such as slow, confusing, clear, and helpful.",
        failedExampleIds,
      },
    ],
    summary: `${baselineResult.method.name} misses ${errorAnalysis.baseline.failedCount} dev samples because its keyword coverage is too narrow.`,
  };
}

function buildInnovationCandidates(baselineResult, improvedResult, weaknessDiagnosis) {
  const candidate = {
    id: "extend-keyword-coverage",
    methodId: improvedResult.method.id,
    title: "Extend keyword coverage from baseline failures",
    addresses: weaknessDiagnosis.weaknesses.map((weakness) => weakness.id),
    expectedMetric: "accuracy",
    observedDelta: roundMetric(improvedResult.score.accuracy - baselineResult.score.accuracy),
    evidence: {
      baselineAccuracy: baselineResult.score.accuracy,
      improvedAccuracy: improvedResult.score.accuracy,
      resolvedExampleIds: weaknessDiagnosis.failedExampleIds,
    },
  };

  return {
    candidates: [candidate],
    selectedCandidate: candidate,
  };
}

function buildAlgorithmDesign(selectedCandidate) {
  return {
    methodId: selectedCandidate.methodId,
    methodName: METHOD_METADATA.improved.name,
    designType: "deterministic keyword rule",
    steps: [
      "Lowercase each input text.",
      "Match positive and negative keyword lists derived from observed failures.",
      "Return neutral when no sentiment keyword is found.",
    ],
    targetWeaknesses: selectedCandidate.addresses,
    noTrainingRequired: true,
    externalCommandRequired: false,
  };
}

function buildExperimentMatrix(baselineResult, improvedResult) {
  return {
    metric: "accuracy",
    rows: [baselineResult, improvedResult].map((result) => ({
      methodId: result.method.id,
      methodName: result.method.name,
      split: result.dataset.split,
      accuracy: result.score.accuracy,
      correct: result.score.correct,
      total: result.score.total,
      commandExecution: false,
    })),
  };
}

function buildFinalDecision(ablationTable, evaluationResult, errorAnalysis) {
  const improvedRow = ablationTable.rows.find((row) => row.methodId === evaluationResult.improved.method.id);

  return {
    selectedMethodId: ablationTable.bestMethodId,
    selectedMethodName: evaluationResult.improved.method.name,
    metric: ablationTable.metric,
    delta: improvedRow.deltaFromBaseline,
    baselineAccuracy: evaluationResult.baseline.score.accuracy,
    improvedAccuracy: evaluationResult.improved.score.accuracy,
    resolvedBaselineErrors: errorAnalysis.resolvedByImproved.length,
    rationale: `${evaluationResult.improved.method.name} is selected because it improves accuracy by ${improvedRow.deltaFromBaseline} and resolves ${errorAnalysis.resolvedByImproved.length} baseline errors.`,
  };
}

function buildFinalReport(allArtifacts) {
  const delta = roundMetric(allArtifacts.improved.score.accuracy - allArtifacts.baseline.score.accuracy);

  return {
    competitionName: allArtifacts.competitionBrief.competitionName,
    taskType: allArtifacts.competitionBrief.taskType,
    metric: allArtifacts.metricAnalysis.metric,
    scores: {
      baseline: allArtifacts.baseline.score.accuracy,
      improved: allArtifacts.improved.score.accuracy,
      delta,
    },
    ablationDelta: allArtifacts.ablation.rows[1].deltaFromBaseline,
    selectedMethodId: allArtifacts.finalDecision.selectedMethodId,
    baselineFailedCount: allArtifacts.errorAnalysis.baseline.failedCount,
    improvedFailedCount: allArtifacts.errorAnalysis.improved.failedCount,
    safety: {
      repositoryWrite: false,
      externalCommandExecution: false,
      commit: false,
      push: false,
      pr: false,
    },
    summary: `${allArtifacts.finalDecision.selectedMethodName} is the current demo winner with ${allArtifacts.improved.score.accuracy} accuracy versus ${allArtifacts.baseline.score.accuracy} baseline accuracy.`,
  };
}

function runKeywordMethod({ fixture, method, keywords }) {
  const predictions = fixture.dev.map((sample) => ({
    id: sample.id,
    label: predictLabel(sample.text, keywords),
  }));

  return {
    method,
    dataset: {
      competitionId: fixture.id,
      split: "dev",
      total: fixture.dev.length,
    },
    predictions,
    score: scorePredictions(fixture.dev, predictions),
  };
}

function predictLabel(text, keywords) {
  const normalizedText = text.toLowerCase();

  for (const label of ["positive", "negative"]) {
    if (keywords[label].some((keyword) => normalizedText.includes(keyword))) {
      return label;
    }
  }

  return "neutral";
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function createConfusionMatrix(samples, predictions) {
  const labels = new Set(LABELS);

  for (const sample of samples) labels.add(sample.label);
  for (const prediction of predictions) labels.add(prediction.label || prediction.prediction);

  const matrix = {};
  for (const actual of labels) {
    matrix[actual] = {};
    for (const predicted of labels) {
      matrix[actual][predicted] = 0;
    }
  }

  return matrix;
}

function ensureMatrixCell(matrix, actual, predicted) {
  if (!matrix[actual]) matrix[actual] = {};
  if (matrix[actual][predicted] === undefined) matrix[actual][predicted] = 0;
}

function countLabels(samples, labels) {
  const counts = Object.fromEntries(labels.map((label) => [label, 0]));

  for (const sample of samples) {
    counts[sample.label] = (counts[sample.label] || 0) + 1;
  }

  return counts;
}

function unique(values) {
  return [...new Set(values)];
}

function roundMetric(value) {
  return Number(value.toFixed(6));
}

module.exports = {
  buildAblationTable,
  buildAlgorithmDesign,
  buildCompetitionBrief,
  buildDataProfile,
  buildErrorAnalysis,
  buildExperimentMatrix,
  buildFinalDecision,
  buildFinalReport,
  buildInnovationCandidates,
  buildMetricAnalysis,
  buildWeaknessDiagnosis,
  loadCompetitionFixture,
  runBaseline,
  runImprovedMethod,
  scorePredictions,
};
