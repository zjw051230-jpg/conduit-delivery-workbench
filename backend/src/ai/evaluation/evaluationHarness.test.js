const {
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
} = require("./evaluationHarness");

describe("evaluation harness", () => {
  test("loads the demo text classification fixture", () => {
    const fixture = loadCompetitionFixture();

    expect(fixture.id).toBe("demo-text-classification");
    expect(fixture.labels).toEqual(["positive", "negative", "neutral"]);
    expect(fixture.taskType).toBe("single-label text classification");
    expect(fixture.scoringMetric).toBe("accuracy");
    expect(fixture.inputFormat).toEqual({ id: "string", text: "string" });
    expect(fixture.outputFormat).toEqual({ id: "string", label: "positive | negative | neutral" });
    expect(fixture.methods.baseline.name).toBe("Baseline keyword rule");
    expect(fixture.methods.improved.name).toBe("Improved keyword rule");
    expect(fixture.train.length).toBeGreaterThan(0);
    expect(fixture.dev).toHaveLength(5);
    expect(fixture.dev[0]).toMatchObject({ id: "dev-1", label: "positive" });
  });

  test("scores predictions with accuracy, confusion matrix, and failed examples", () => {
    const samples = [
      { id: "sample-1", text: "great", label: "positive" },
      { id: "sample-2", text: "slow", label: "negative" },
      { id: "sample-3", text: "release notes", label: "neutral" },
      { id: "sample-4", text: "clean", label: "positive" },
    ];
    const predictions = [
      { id: "sample-1", label: "positive" },
      { id: "sample-2", label: "neutral" },
      { id: "sample-3", label: "neutral" },
      { id: "sample-4", label: "positive" },
    ];

    const score = scorePredictions(samples, predictions);

    expect(score.total).toBe(4);
    expect(score.correct).toBe(3);
    expect(score.accuracy).toBe(0.75);
    expect(score.confusionMatrix.negative.neutral).toBe(1);
    expect(score.failedExamples).toEqual([
      {
        id: "sample-2",
        text: "slow",
        label: "negative",
        prediction: "neutral",
      },
    ]);
  });

  test("runs a keyword baseline and returns a real score", () => {
    const fixture = loadCompetitionFixture();

    const baseline = runBaseline(fixture);

    expect(baseline.method.id).toBe("baseline-keyword-rule");
    expect(baseline.score.total).toBe(5);
    expect(baseline.score.correct).toBe(3);
    expect(baseline.score.accuracy).toBe(0.6);
    expect(baseline.predictions).toHaveLength(5);
  });

  test("runs an improved keyword method with a better score than baseline", () => {
    const fixture = loadCompetitionFixture();
    const baseline = runBaseline(fixture);

    const improved = runImprovedMethod(fixture);

    expect(improved.method.id).toBe("improved-keyword-rule");
    expect(improved.score.total).toBe(5);
    expect(improved.score.correct).toBe(5);
    expect(improved.score.accuracy).toBeGreaterThan(baseline.score.accuracy);
  });

  test("builds ablation and error analysis from baseline and improved runs", () => {
    const fixture = loadCompetitionFixture();
    const baseline = runBaseline(fixture);
    const improved = runImprovedMethod(fixture);

    const ablation = buildAblationTable({ baseline, improved });
    const errorAnalysis = buildErrorAnalysis({ baseline, improved });

    expect(ablation.rows.map((row) => row.methodId)).toEqual([
      "baseline-keyword-rule",
      "improved-keyword-rule",
    ]);
    expect(ablation.rows[0]).toMatchObject({ accuracy: 0.6, deltaFromBaseline: 0 });
    expect(ablation.rows[1].accuracy).toBe(1);
    expect(ablation.rows[1].deltaFromBaseline).toBeCloseTo(0.4, 5);
    expect(errorAnalysis.baseline.failedCount).toBe(2);
    expect(errorAnalysis.improved.failedCount).toBe(0);
    expect(errorAnalysis.baseline.failedExamples.map((example) => example.id)).toEqual(["dev-4", "dev-5"]);
  });

  test("builds research artifacts from fixture metadata and scoring evidence", () => {
    const fixture = loadCompetitionFixture();
    const baseline = runBaseline(fixture);
    const improved = runImprovedMethod(fixture);
    const ablation = buildAblationTable({ baseline, improved });
    const errorAnalysis = buildErrorAnalysis({ baseline, improved });

    const competitionBrief = buildCompetitionBrief(fixture);
    const dataProfile = buildDataProfile(fixture);
    const metricAnalysis = buildMetricAnalysis(fixture, { baseline, improved });
    const weaknessDiagnosis = buildWeaknessDiagnosis(baseline, errorAnalysis);
    const innovationCandidates = buildInnovationCandidates(baseline, improved, weaknessDiagnosis);
    const algorithmDesign = buildAlgorithmDesign(innovationCandidates.selectedCandidate);
    const experimentMatrix = buildExperimentMatrix(baseline, improved);
    const finalDecision = buildFinalDecision(ablation, { baseline, improved }, errorAnalysis);
    const finalReport = buildFinalReport({
      competitionBrief,
      dataProfile,
      metricAnalysis,
      baseline,
      improved,
      ablation,
      errorAnalysis,
      finalDecision,
    });

    expect(competitionBrief).toMatchObject({
      competitionName: "Demo Text Classification",
      taskType: "single-label text classification",
      labels: ["positive", "negative", "neutral"],
    });
    expect(dataProfile.trainSize).toBe(5);
    expect(dataProfile.devSize).toBe(5);
    expect(dataProfile.labelDistribution.dev).toEqual({ positive: 2, negative: 2, neutral: 1 });
    expect(metricAnalysis.metric).toBe("accuracy");
    expect(metricAnalysis.scores.baseline.accuracy).toBe(0.6);
    expect(weaknessDiagnosis.failedExampleIds).toEqual(["dev-4", "dev-5"]);
    expect(innovationCandidates.candidates[0].addresses).toContain("keyword coverage gap");
    expect(algorithmDesign.methodId).toBe("improved-keyword-rule");
    expect(experimentMatrix.rows.map((row) => row.methodId)).toEqual([
      "baseline-keyword-rule",
      "improved-keyword-rule",
    ]);
    expect(finalDecision.selectedMethodId).toBe("improved-keyword-rule");
    expect(finalDecision.delta).toBeCloseTo(0.4, 5);
    expect(finalReport.scores).toMatchObject({ baseline: 0.6, improved: 1, delta: 0.4 });
  });
});
