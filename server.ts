import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock Memory Store (following the Key Unlock Architecture)
  const memoryStore: any[] = [];

  app.post("/api/memory", (req, res) => {
    const { content, keys, kind } = req.body;
    const newMemory = {
      id: Math.random().toString(36).substr(2, 9),
      kind,
      content,
      keys,
      timestamp: new Date().toISOString(),
    };
    memoryStore.push(newMemory);
    res.json(newMemory);
  });

  app.get("/api/memory", (req, res) => {
    res.json(memoryStore);
  });

  let useSimulatedIntel = false;

  app.get("/api/threat-intel", async (req, res) => {
    // Fallback data
    const simulatedData = [
      {
        id: "sim-001",
        ioc: "192.168.44.12",
        threat_type: "botnet_c2",
        threat_type_desc: "Botnet C2",
        ioc_type: "ip:port",
        ioc_type_desc: "IP:Port",
        malware: "cobalt_strike",
        malware_printable: "Cobalt Strike",
        confidence_level: 95,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        reference: "https://aegis.internal/intel/sim-001",
        reporter: "Aegis_Sentinel"
      },
      {
        id: "sim-002",
        ioc: "secure-update-service.com",
        threat_type: "phishing",
        threat_type_desc: "Phishing",
        ioc_type: "domain",
        ioc_type_desc: "Domain",
        malware: "unknown",
        malware_printable: "Credential Harvester",
        confidence_level: 82,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        reference: "https://aegis.internal/intel/sim-002",
        reporter: "Aegis_Sentinel"
      },
      {
        id: "sim-003",
        ioc: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        threat_type: "payload",
        threat_type_desc: "Payload",
        ioc_type: "sha256",
        ioc_type_desc: "SHA256",
        malware: "emotet",
        malware_printable: "Emotet",
        confidence_level: 100,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        reference: "https://aegis.internal/intel/sim-003",
        reporter: "Aegis_Sentinel"
      },
      {
        id: "sim-004",
        ioc: "45.11.22.33",
        threat_type: "bruteforce",
        threat_type_desc: "Brute Force",
        ioc_type: "ip:port",
        ioc_type_desc: "IP:Port",
        malware: "mirai",
        malware_printable: "Mirai Variant",
        confidence_level: 65,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        reference: "https://aegis.internal/intel/sim-004",
        reporter: "Aegis_Sentinel"
      }
    ];

    if (useSimulatedIntel) {
      return res.json({ query_status: "ok", data: simulatedData, source: "simulated" });
    }

    try {
      const response = await fetch("https://api.threatfox.abuse.ch/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_recent", days: 1 }),
        signal: AbortSignal.timeout(3000), // Shorter timeout
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      res.json({ ...data, source: "live" });
    } catch (error: any) {
      // If it's a DNS error or timeout, switch to simulated mode permanently for this session
      if (error.code === 'ENOTFOUND' || error.name === 'TimeoutError' || error.message.includes('fetch failed')) {
        console.log("[INFO] ThreatFox API unreachable (DNS/Network). Switching to Aegis Internal Sentinel.");
        useSimulatedIntel = true;
      } else {
        console.warn("[WARN] Threat Intel Fetch Error:", error.message);
      }
      
      res.json({ 
        query_status: "ok", 
        data: simulatedData, 
        source: "simulated",
        error_context: error instanceof Error ? error.message : "Network unreachable"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
