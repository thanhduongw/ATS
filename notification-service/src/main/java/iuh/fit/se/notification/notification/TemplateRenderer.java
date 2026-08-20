package iuh.fit.se.notification.notification;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Thay thế placeholder dạng {{key}} trong subject/body bằng giá trị tương ứng trong data. */
public final class TemplateRenderer {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*(\\w+)\\s*}}");

    private TemplateRenderer() {}

    public static String render(String text, Map<String, String> data) {
        if (text == null) return null;
        Matcher matcher = PLACEHOLDER.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = data != null ? data.getOrDefault(key, matcher.group(0)) : matcher.group(0);
            matcher.appendReplacement(result, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
