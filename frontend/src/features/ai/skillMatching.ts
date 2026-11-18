import { foldText } from "../../app/text";

/**
 * Ghép kỹ năng AI đọc được trong CV với danh mục kỹ năng, theo CẢ TỪ chứ không theo chuỗi con:
 * "Java" không kéo theo "JavaScript", "SQL" không kéo theo "MySQL" / "PostgreSQL", "React Native" không kéo theo "React".
 * Vẫn nhận các cách viết hay gặp: "NodeJS" = "Node.js", "HTML5" → "HTML/CSS", "Java 17" → "Java", "Golang" → "Go".
 */

/** Cả kỹ năng trong CV chỉ là một từ viết tắt / tên gọi khác. */
const ALIASES: Record<string, string[]> = {
    js: ["javascript"],
    ts: ["typescript"],
    golang: ["go"],
    postgres: ["postgresql"],
    k8s: ["kubernetes"],
};

function tokens(text: string): string[] {
    return foldText(text)
        .split(/[^a-z0-9#+]+/)
        .filter((t) => t !== "" && !/^\d+$/.test(t)) // "Java 17" → bỏ số phiên bản đứng riêng
        .map((t) => t.replace(/([a-z])\d+$/, "$1")) // "HTML5" → "html", "Python3" → "python"
        .flatMap((t) => (t.length > 2 && t.endsWith("js") ? [t.slice(0, -2), "js"] : [t])); // "NodeJS" → node js
}

function cvSkillTokens(skill: string): string[] {
    const t = tokens(skill);
    return t.length === 1 && ALIASES[t[0]] ? ALIASES[t[0]] : t;
}

/** Các dãy từ nhận ra một mục danh mục: tên đủ, tên bỏ phần trong ngoặc, từng vế của tên ghép bằng "/". */
function catalogRuns(name: string): string[][] {
    const base = name.replace(/\s*\([^)]*\)\s*$/, ""); // "Rust (cơ bản)" → "Rust"
    const runs = [name, base, ...base.split("/")].map(tokens).filter((t) => t.length > 0);
    // "Node.js", "Vue.js": CV ghi "Node", "Vue" cũng tính.
    for (const run of [...runs]) {
        if (run.length > 1 && run[run.length - 1] === "js") runs.push(run.slice(0, -1));
    }
    return runs;
}

/** `needle` có nằm liền một mạch trong `hay` không. */
function containsRun(hay: string[], needle: string[]): boolean {
    for (let i = 0; i + needle.length <= hay.length; i++) {
        if (needle.every((word, j) => hay[i + j] === word)) return true;
    }
    return false;
}

export interface SkillCatalogEntry {
    id: number;
    name: string;
}

/** Id các mục danh mục khớp với kỹ năng trong CV, theo thứ tự của danh mục. */
export function matchCatalogSkills(cvSkills: readonly string[], catalog: readonly SkillCatalogEntry[]): number[] {
    const entries = catalog.map((item) => ({ id: item.id, runs: catalogRuns(item.name) }));
    const matched = new Set<number>();
    for (const skill of cvSkills) {
        const hay = cvSkillTokens(skill);
        if (hay.length === 0) continue;
        const hits = entries.flatMap(({ id, runs }) => {
            const run = runs.filter((r) => containsRun(hay, r)).sort((a, b) => b.length - a.length)[0];
            return run ? [{ id, run }] : [];
        });
        for (const hit of hits) {
            // "React Native" khớp cả "React" lẫn "React Native" → chỉ giữ mục cụ thể hơn.
            const shadowed = hits.some((other) => other.run.length > hit.run.length && containsRun(other.run, hit.run));
            if (!shadowed) matched.add(hit.id);
        }
    }
    return catalog.filter((item) => matched.has(item.id)).map((item) => item.id);
}
