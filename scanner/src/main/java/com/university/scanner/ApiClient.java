package com.university.scanner;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;

final class ApiClient {
    record ScanResult(boolean accepted, String reason, String message, String appointmentId, String token, String studentName,
                      String studentId, String facultyName, String officeRoom, String service,
                      String date, String startTime, String endTime, String status) {}
    record CallDisplay(boolean active, String appointmentId, String token, String studentId, String studentName, String service, String startTime, String endTime, String status) {}
    record StudentMessage(String appointmentId, String token, String arrivalStatus, String facultyResponse,
                          String message, String status, String nextToken, String nextStudentId,
                          String nextStudentName, String nextService, String nextStartTime, String nextEndTime) {}
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private final String baseUrl;
    private final String deviceKey;
    ApiClient(String baseUrl) { this.baseUrl=baseUrl.replaceAll("/+$",""); this.deviceKey=System.getProperty("device.key", System.getenv().getOrDefault("UNIVERSITY_DEVICE_KEY", "")); }
    boolean health() throws Exception {
        var req=HttpRequest.newBuilder(URI.create(baseUrl+"/api/health")).timeout(Duration.ofSeconds(6)).GET().build();
        return client.send(req,HttpResponse.BodyHandlers.ofString()).statusCode()==200;
    }
    ScanResult scan(String qrPayload, String deviceName) throws Exception {
        String body="{\"qrPayload\":\""+Json.escape(qrPayload)+"\",\"deviceName\":\""+Json.escape(deviceName)+"\"}";
        var req=HttpRequest.newBuilder(URI.create(baseUrl+"/api/tickets/scan")).timeout(Duration.ofSeconds(10))
                .header("Content-Type","application/json").header("X-Device-Key",deviceKey).POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var response=client.send(req,HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200) throw new IllegalStateException("Server returned HTTP "+response.statusCode());
        String json=response.body(), a=Json.object(json,"appointment");
        return new ScanResult(Json.bool(json,"accepted"),Json.string(json,"reason"),Json.string(json,"message"),
                Json.string(a,"id"),Json.string(a,"token"),Json.string(a,"studentName"),Json.string(a,"studentId"),Json.string(a,"facultyName"),
                Json.string(a,"officeRoom"),Json.string(a,"service"),Json.string(a,"date"),Json.string(a,"startTime"),
                Json.string(a,"endTime"),Json.string(a,"status"));
    }
    ScanResult scanNfc(String nfcUid, String deviceName) throws Exception {
        String body="{\"nfcUid\":\""+Json.escape(nfcUid)+"\",\"deviceName\":\""+Json.escape(deviceName)+"\"}";
        return sendScan(baseUrl+"/api/tickets/scan-by-nfc", body);
    }
    StudentMessage studentMessage(String appointmentId) throws Exception {
        var req=HttpRequest.newBuilder(URI.create(baseUrl+"/api/appointments/"+appointmentId+"/student-message"))
                .timeout(Duration.ofSeconds(8)).header("X-Device-Key",deviceKey).GET().build();
        var response=client.send(req,HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200) throw new IllegalStateException("Server returned HTTP "+response.statusCode());
        String json=response.body();
        String next=Json.object(json,"nextStudent");
        return new StudentMessage(Json.string(json,"appointmentId"),Json.string(json,"token"),
                Json.string(json,"arrivalStatus"),Json.string(json,"facultyResponse"),
                Json.string(json,"message"),Json.string(json,"status"),
                Json.string(next,"token"),Json.string(next,"studentId"),Json.string(next,"studentName"),
                Json.string(next,"service"),Json.string(next,"startTime"),Json.string(next,"endTime"));
    }

    CallDisplay callDisplay(String facultyId) throws Exception {
        var req=HttpRequest.newBuilder(URI.create(baseUrl+"/api/faculty/"+java.net.URLEncoder.encode(facultyId, java.nio.charset.StandardCharsets.UTF_8)+"/call-display"))
                .timeout(Duration.ofSeconds(8)).header("X-Device-Key",deviceKey).GET().build();
        var response=client.send(req,HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200) throw new IllegalStateException("Server returned HTTP "+response.statusCode());
        String json=response.body(), call=Json.object(json,"call");
        return new CallDisplay(Json.bool(json,"active"),Json.string(call,"appointmentId"),Json.string(call,"token"),
                Json.string(call,"studentId"),Json.string(call,"studentName"),Json.string(call,"service"),
                Json.string(call,"startTime"),Json.string(call,"endTime"),Json.string(call,"status"));
    }

    AutoCloseable streamAppointment(String appointmentId, BiConsumer<String,String> onEvent, java.util.function.Consumer<Throwable> onError) {
        AtomicBoolean closed=new AtomicBoolean(false);
        var req=HttpRequest.newBuilder(URI.create(baseUrl+"/api/realtime/appointments/"+java.net.URLEncoder.encode(appointmentId, java.nio.charset.StandardCharsets.UTF_8)))
                .header("Accept","text/event-stream").header("X-Device-Key",deviceKey).GET().build();
        CompletableFuture<HttpResponse<java.util.stream.Stream<String>>> future=client.sendAsync(req,HttpResponse.BodyHandlers.ofLines());
        future.thenAcceptAsync(response->{
            if(response.statusCode()!=200)throw new java.util.concurrent.CompletionException(new IllegalStateException("Live server returned HTTP "+response.statusCode()));
            final String[] event={"message"};
            try(var lines=response.body()){
                lines.takeWhile(line->!closed.get()).forEach(line->{
                    if(line.startsWith("event:"))event[0]=line.substring(6).trim();
                    else if(line.startsWith("data:")){String data=line.substring(5).trim();onEvent.accept(event[0],data);event[0]="message";}
                });
            }
        }).exceptionally(error->{if(!closed.get())onError.accept(error.getCause()==null?error:error.getCause());return null;});
        return ()->{closed.set(true);future.cancel(true);};
    }

    private ScanResult sendScan(String endpoint, String body) throws Exception {
        var req=HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(10))
                .header("Content-Type","application/json").header("X-Device-Key",deviceKey).POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var response=client.send(req,HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200) throw new IllegalStateException("Server returned HTTP "+response.statusCode());
        String json=response.body(), a=Json.object(json,"appointment");
        return new ScanResult(Json.bool(json,"accepted"),Json.string(json,"reason"),Json.string(json,"message"),
                Json.string(a,"id"),Json.string(a,"token"),Json.string(a,"studentName"),Json.string(a,"studentId"),Json.string(a,"facultyName"),
                Json.string(a,"officeRoom"),Json.string(a,"service"),Json.string(a,"date"),Json.string(a,"startTime"),
                Json.string(a,"endTime"),Json.string(a,"status"));
    }
}
