package com.university.pos.model;

public record ServiceType(String id, String facultyId, String name, int durationMinutes) {
    @Override public String toString() { return name + " (" + durationMinutes + " min)"; }
}
