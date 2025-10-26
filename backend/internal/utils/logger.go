package utils

import (
	"log"
)

type Logger struct {
	env string
}

func NewLogger(env string) *Logger {
	return &Logger{env: env}
}

func (l *Logger) Info(msg string, args ...interface{}) {
	log.Printf("ℹ️  "+msg, args...)
}

func (l *Logger) Warn(msg string, args ...interface{}) {
	log.Printf("⚠️  "+msg, args...)
}

func (l *Logger) Error(msg string, args ...interface{}) {
	log.Printf("❌  "+msg, args...)
}

func (l *Logger) Fatal(msg string, args ...interface{}) {
	log.Fatalf("💀  "+msg, args...)
}
