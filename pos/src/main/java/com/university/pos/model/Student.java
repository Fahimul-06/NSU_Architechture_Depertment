package com.university.pos.model;

public record Student(String id, String name, String department, String nfcUid) {
    @Override public String toString() { return name + " (" + id + ")"; }
}
