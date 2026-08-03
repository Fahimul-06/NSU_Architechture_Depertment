package com.university.pos.model;

public record Faculty(String id, String name, String designation, String departmentCode, String officeRoom) {
    @Override public String toString() { return name + " — " + designation; }
}
