package main

import (
	"log"
	"os"
	"os/exec"
)

func main() {
	log.Println("🚀 Running migrations and seed before starting server...")

	cmd := exec.Command("./seed")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Error running seed: %v", err)
	} else {
		log.Println("✅ Seed completed successfully.")
	}

	log.Println("🌐 Starting fleet-backend...")
	server := exec.Command("./fleet-backend")
	server.Stdout = os.Stdout
	server.Stderr = os.Stderr
	if err := server.Run(); err != nil {
		log.Fatalf("❌ Server exited with error: %v", err)
	}
}
