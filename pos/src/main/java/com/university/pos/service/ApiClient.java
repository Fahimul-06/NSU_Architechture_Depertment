package com.university.pos.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.university.pos.model.*;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.List;

public final class ApiClient {
    private final String baseUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();
    private final Gson gson = new Gson();

    public ApiClient() {
        this.baseUrl = System.getProperty("api.url", System.getenv().getOrDefault("UNIVERSITY_API_URL", "http://localhost:8080"));
    }

    private HttpResponse<String> getResponse(String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(java.time.Duration.ofSeconds(10)).GET().build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IOException(error(response));
        return response;
    }

    private String get(String path) throws IOException, InterruptedException {
        return getResponse(path).body();
    }

    private String post(String path, Object body) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(java.time.Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body))).build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IOException(error(response));
        return response.body();
    }

    private String error(HttpResponse<String> r) {
        try { return gson.fromJson(r.body(), ErrorBody.class).message; }
        catch (Exception ignored) { return "API request failed: HTTP " + r.statusCode(); }
    }

    public Student studentByNfc(String uid) throws Exception {
        String normalized = uid == null ? "" : uid.replaceAll("[^0-9A-Fa-f]", "").toUpperCase();
        if (normalized.isBlank()) throw new IOException("No NFC UID was received from the reader.");
        return gson.fromJson(get("/api/students/by-nfc?uid=" + URLEncoder.encode(normalized, StandardCharsets.UTF_8)), Student.class);
    }
    public Student pendingStudentForTerminal(String terminalId) throws Exception {
        HttpResponse<String> response = getResponse("/api/pos-sessions/pending?terminalId=" + URLEncoder.encode(terminalId, StandardCharsets.UTF_8));
        if (response.statusCode() == 204 || response.body() == null || response.body().isBlank()) return null;
        PendingSession pending = gson.fromJson(response.body(), PendingSession.class);
        return pending == null ? null : pending.student;
    }
    public List<Department> departments() throws Exception {
        return gson.fromJson(get("/api/departments"), new TypeToken<List<Department>>(){}.getType());
    }
    public List<Faculty> faculties(String department) throws Exception {
        return gson.fromJson(get("/api/faculties?department=" + URLEncoder.encode(department, StandardCharsets.UTF_8)), new TypeToken<List<Faculty>>(){}.getType());
    }
    public List<ServiceType> services(String facultyId) throws Exception {
        List<ApiService> rows = gson.fromJson(get("/api/services?facultyId=" + URLEncoder.encode(facultyId, StandardCharsets.UTF_8)), new TypeToken<List<ApiService>>(){}.getType());
        return rows.stream().map(x -> new ServiceType(x.id, x.facultyId, x.name, x.duration)).toList();
    }
    public Appointment createAppointment(Student student, Department department, Faculty faculty, ServiceType service) throws Exception {
        CreateRequest req = new CreateRequest(student.id(), department.code(), faculty.id(), service.id());
        ApiAppointment a = gson.fromJson(post("/api/appointments", req), ApiAppointment.class);
        return new Appointment(a.id, a.token, student, department, faculty, service, LocalDate.parse(a.date), LocalTime.parse(a.startTime), LocalTime.parse(a.endTime), a.qrPayload);
    }

    private static final class PendingSession { Student student; }
    private record CreateRequest(String studentId, String departmentCode, String facultyId, String serviceId) {}
    private record ApiService(String id, String facultyId, String name, int duration) {}
    private record ApiAppointment(String id, String token, String date, String startTime, String endTime, String qrPayload) {}
    private static final class ErrorBody { String message; }
}
