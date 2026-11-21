package com.cpx.doomscrolltax.guard;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/** One multiple-choice question, same shape as the web app's questions. */
public final class GuardQuestion {
    public final String id;
    public final String question;
    public final String[] options;
    public final int answerIndex;
    public final String explanation;

    public GuardQuestion(String id, String question, String[] options, int answerIndex, String explanation) {
        this.id = id;
        this.question = question;
        this.options = options;
        this.answerIndex = answerIndex;
        this.explanation = explanation == null ? "" : explanation;
    }

    /** Same question with its options in a new random order. */
    public GuardQuestion shuffled(Random random) {
        int len = options.length;
        int[] order = new int[len];
        for (int i = 0; i < len; i++) order[i] = i;
        for (int i = len - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int t = order[i];
            order[i] = order[j];
            order[j] = t;
        }
        String[] opts = new String[len];
        int newAnswer = 0;
        for (int i = 0; i < len; i++) {
            opts[i] = options[order[i]];
            if (order[i] == answerIndex) newAnswer = i;
        }
        return new GuardQuestion(id, question, opts, newAnswer, explanation);
    }

    /** Parses the web app's question list; skips anything malformed. */
    public static List<GuardQuestion> parseList(String json) {
        List<GuardQuestion> out = new ArrayList<>();
        if (json == null || json.isEmpty()) return out;
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                JSONArray opts = o.optJSONArray("options");
                if (opts == null || opts.length() < 2) continue;
                String[] options = new String[opts.length()];
                for (int k = 0; k < opts.length(); k++) options[k] = opts.optString(k, "");
                int answer = o.optInt("answerIndex", -1);
                String text = o.optString("question", "");
                if (answer < 0 || answer >= options.length || text.isEmpty()) continue;
                out.add(new GuardQuestion(o.optString("id", "q" + i), text, options, answer,
                        o.optString("explanation", "")));
            }
        } catch (Exception ignored) {
            // Bad JSON: caller falls back to the built-in questions.
        }
        return out;
    }

    /** Used until the web app has synced questions from the user's slides. */
    public static List<GuardQuestion> fallback() {
        List<GuardQuestion> list = new ArrayList<>();
        list.add(new GuardQuestion("g1", "What does Big-O notation describe?",
                new String[]{"How running time grows with input size", "The exact running time in seconds",
                        "How much memory a computer has", "The number of lines of code"}, 0,
                "Big-O describes the growth rate of running time as the input gets larger."));
        list.add(new GuardQuestion("g2", "Which search needs the data to be sorted first?",
                new String[]{"Binary search", "Linear search", "Random search", "Breadth-first search"}, 0,
                "Binary search halves a sorted range at each step."));
        list.add(new GuardQuestion("g3", "What does the testing effect say about learning?",
                new String[]{"Recalling information strengthens memory", "Re-reading is the best way to learn",
                        "Tests only measure learning", "Cramming beats spacing"}, 0,
                "Actively retrieving information makes it easier to remember later."));
        list.add(new GuardQuestion("g4", "A queue removes items in which order?",
                new String[]{"First in, first out", "Last in, first out", "Largest first", "Alphabetical order"}, 0,
                "A queue is FIFO: the earliest added item leaves first."));
        return list;
    }
}
