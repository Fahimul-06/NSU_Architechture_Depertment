package com.university.scanner;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class Json {
    private Json() {}
    static String string(String json, String key) {
        Matcher m = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"").matcher(json);
        return m.find() ? unescape(m.group(1)) : "";
    }
    static boolean bool(String json, String key) {
        Matcher m = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*(true|false)").matcher(json);
        return m.find() && Boolean.parseBoolean(m.group(1));
    }
    static String object(String json, String key) {
        int k=json.indexOf('"'+key+'"'); if(k<0)return ""; int start=json.indexOf('{',k); if(start<0)return "";
        int depth=0; boolean quote=false, esc=false;
        for(int i=start;i<json.length();i++) { char c=json.charAt(i); if(esc){esc=false;continue;} if(c=='\\'){esc=true;continue;} if(c=='"')quote=!quote; if(quote)continue; if(c=='{')depth++; if(c=='}'&&--depth==0)return json.substring(start,i+1); }
        return "";
    }
    static String escape(String value) { return value.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n"); }
    private static String unescape(String value) { return value.replace("\\n","\n").replace("\\\"","\"").replace("\\\\","\\"); }
}
