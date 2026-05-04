
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateQuizQuestions() {
  console.log("\n📚 Generando preguntas del quiz...\n");

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Genera exactamente 5 preguntas de conocimientos generales en formato JSON.
El formato debe ser:
{
  "questions": [
    {
      "id": 1,
      "question": "texto de la pregunta",
      "options": ["opción a", "opción b", "opción c", "opción d"],
      "correct": 0
    }
  ]
}

Las preguntas deben ser sobre historia, geografía, ciencia, cultura y tecnología.
El índice "correct" debe indicar cuál opción (0-3) es la correcta.
Responde SOLO con el JSON válido, sin explicaciones adicionales.`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No se pudo extraer JSON de la respuesta");
  }

  return JSON.parse(jsonMatch[0]);
}

async function runQuiz(quizData) {
  let score = 0;
  const totalQuestions = quizData.questions.length;
  const answers = [];

  console.log("\n🎯 ¡Bienvenido al Quiz de Conocimientos Generales!\n");
  console.log(`Total de preguntas: ${totalQuestions}\n`);
  console.log("=====================================\n");

  for (const question of quizData.questions) {
    console.log(`Pregunta ${question.id}/${totalQuestions}:`);
    console.log(`${question.question}\n`);

    for (let i = 0; i < question.options.length; i++) {
      console.log(`${String.fromCharCode(97 + i)}) ${question.options[i]}`);
    }

    let userAnswer = "";
    let isValid = false;

    while (!isValid) {
      userAnswer = await question(
        "\nTu respuesta (a/b/c/d): "
      );
      userAnswer = userAnswer.toLowerCase().trim();

      if (["a", "b", "c", "d"].includes(userAnswer)) {
        isValid = true;
      } else {
        console.log("❌ Por favor, ingresa una respuesta válida (a/b/c/d)");
      }
    }

    const userAnswerIndex = userAnswer.charCodeAt(0) - 97;
    const isCorrect = userAnswerIndex === question.correct;

    answers.push({
      questionId: question.id,
      userAnswer: userAnswerIndex,
      correctAnswer: question.correct,
      isCorrect: isCorrect,
    });

    if (isCorrect) {
      score++;
      console.log(
        `\n✅ ¡Correcto! La respuesta era: ${question.options[question.correct]}\n`
      );
    } else {
      console.log(
        `\n❌ Incorrecto. La respuesta correcta era: ${question.options[question.correct]}\n`
      );
    }

    console.log("=====================================\n");
  }

  return {
    score: score,
    total: totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100),
    answers: answers,
  };
}

async function displayResults(results) {
  console.log("\n📊 RESULTADOS DEL QUIZ\n");
  console.log("=====================================");
  console.log(`Preguntas correctas: ${results.score}/${results.total}`);
  console.log(`Porcentaje: ${results.percentage}%`);
  console.log("=====================================\n");

  let feedback = "";
  if (results.percentage === 100) {
    feedback = "🌟 ¡Puntuación perfecta! ¡Eres un experto!";
  } else if (results.percentage >= 80) {
    feedback = "🎉 ¡Excelente desempeño!";
  } else if (results.percentage >= 60) {
    feedback = "👍 ¡Buen trabajo!";
  } else if (results.percentage >= 40) {
    feedback = "📚 Puedes mejorar estudiando más.";
  } else {
    feedback = "💪 ¡Sigue practicando!";
  }

  console.log(feedback + "\n");

  const generateFeedback = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Basándote en los siguientes resultados de un quiz:
- Puntuación: ${results.score}/${results.total} (${results.percentage}%)
- Preguntas incorrectas: ${results.total - results.score}

Proporciona un breve comentario motivacional y un consejo para mejorar (máximo 3 líneas).
Responde en español de forma amigable y constructiva.`,
      },
    ],
  });

  const feedbackText =
    generateFeed