# Learning Korean Lesson Templates

This repository contains reusable lesson templates for teaching Korean on Preply, plus a small lesson app that protects access with time-limited links.

## Goal

Build practical lesson materials for beginner, intermediate, and advanced learners using a repeatable workflow:

1. Start with a situation or roleplay.
2. Turn the learner's native-language idea into natural Korean.
3. Practice reading and pronunciation together.
4. Explain grammar and vocabulary in context.
5. Expand into speaking practice and homework.

## Repository Structure

- `templates/universal-lesson-template.md`
  - Main lesson template for everyday use
- `templates/level-guides.md`
  - How to adapt the same lesson for beginner, intermediate, and advanced learners
- `templates/material-creation-workflow.md`
  - Recommended process for creating lessons with AI
- `prompts/roleplay-converter-prompt.md`
  - Prompt for converting learner ideas into natural Korean teaching material
- `samples/sample-beginner-lesson-cafe-ordering.md`
  - Example beginner lesson
- `data/lessons/sample-cafe-ordering.json`
  - Example lesson used by the protected lesson site
- `app/server.js`
  - Small Node server that checks signed lesson links
- `scripts/generate-link.js`
  - Script for making a lesson URL that expires automatically

## Recommended Teaching Flow

1. Choose one real-life situation.
2. Set one speaking goal and one grammar goal.
3. Generate a short, natural dialogue.
4. Highlight key expressions and pronunciation points.
5. Practice substitution drills.
6. Move into personalized speaking.
7. End with a short review and homework.

## Design Principles

- Focus on real spoken Korean, not translation-heavy textbook sentences.
- Keep each lesson narrow and clear.
- Teach grammar through use, not long explanations.
- Show how vocabulary changes across contexts.
- Include pronunciation and intonation practice in every lesson.
- Reuse the same structure so lesson prep stays fast.

## Suggested Next Steps

- Add more sample lessons by theme:
  - cafe
  - travel
  - friends
  - work
  - hospital
  - dating
  - TOPIK speaking
- Add separate pronunciation drill packs.
- Add culture notes for common misunderstandings.

## Protected Lesson Access

This app is designed so you can send a lesson URL to a student before class without leaving the lesson open forever.

### How it works

1. You keep a server-side secret in `.env`.
2. Before class, you generate a signed lesson URL for one student.
3. The link includes an expiration time.
4. When the time is over, the lesson page stops working.

This is much safer than putting a password only in the front-end, because the expiration check and signature validation happen on the server.

### Setup

1. Copy `.env.example` to `.env`
2. Set a long random value for `APP_SECRET`
3. Start the app:

```bash
npm start
```

4. Generate a lesson link:

```bash
npm run generate-link -- sample-cafe-ordering "Student Name" 60
```

This creates a signed URL that works for 60 minutes.

If you already have a local `.env` file, the script reads it automatically, so you do not need to prepend environment variables manually.

### Fast Daily Use

For everyday lesson prep, run:

```bash
npm run generate-link -- sample-cafe-ordering "Student Name" 60
```

Format:

```bash
npm run generate-link -- <lesson-id> "Student Name" <minutes>
```

### Current Limits

- A student can still share the link during the valid time window.
- For even stronger protection later, you can add:
  - one-time-use tokens
  - email login
  - teacher approval
  - student accounts
