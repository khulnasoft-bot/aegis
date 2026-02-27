import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ThreatIndicator {
  id: string;
  ioc: string;
  threat_type: string;
  threat_type_desc: string;
  ioc_type: string;
  ioc_type_desc: string;
  malware: string;
  malware_printable: string;
  confidence_level: number;
  first_seen: string;
  last_seen: string;
  reference: string;
  reporter: string;
  source: string;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'threat' | 'malware' | 'ioc_type' | 'source';
  confidence?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

export const ThreatGraph: React.FC<{ threats: ThreatIndicator[] }> = ({ threats }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !threats.length || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeSet = new Set<string>();

    const addNode = (id: string, label: string, type: Node['type'], confidence?: number) => {
      if (!nodeSet.has(id)) {
        nodes.push({ id, label, type, confidence });
        nodeSet.add(id);
      }
    };

    threats.forEach(threat => {
      const threatId = `threat-${threat.id}`;
      const malwareId = `malware-${threat.malware_printable || 'unknown'}`;
      const iocTypeId = `type-${threat.ioc_type_desc}`;
      const sourceId = `source-${threat.source}`;

      addNode(threatId, threat.ioc, 'threat', threat.confidence_level);
      addNode(malwareId, threat.malware_printable || 'Unknown Malware', 'malware');
      addNode(iocTypeId, threat.ioc_type_desc, 'ioc_type');
      addNode(sourceId, threat.source, 'source');

      links.push({ source: threatId, target: malwareId });
      links.push({ source: threatId, target: iocTypeId });
      links.push({ source: threatId, target: sourceId });
    });

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const link = svg.append("g")
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", d => d.type === 'threat' ? 6 : 10)
      .attr("fill", d => {
        switch (d.type) {
          case 'threat': return d.confidence && d.confidence > 75 ? "#f87171" : d.confidence && d.confidence > 40 ? "#fbbf24" : "#34d399";
          case 'malware': return "#818cf8";
          case 'ioc_type': return "#a78bfa";
          case 'source': return "#2dd4bf";
          default: return "#94a3b8";
        }
      })
      .attr("stroke", "rgba(255, 255, 255, 0.2)")
      .attr("stroke-width", 1.5);

    node.append("text")
      .attr("x", 12)
      .attr("y", "0.31em")
      .text(d => d.label)
      .attr("fill", "rgba(255, 255, 255, 0.6)")
      .attr("font-size", "8px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none")
      .clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 3);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [threats]);

  return (
    <div ref={containerRef} className="w-full bg-black/40 border border-white/10 rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[8px] uppercase tracking-widest opacity-60">High Confidence Threat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[8px] uppercase tracking-widest opacity-60">Low Confidence Threat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-[8px] uppercase tracking-widest opacity-60">Malware Family</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400" />
          <span className="text-[8px] uppercase tracking-widest opacity-60">Intelligence Source</span>
        </div>
      </div>
      <svg ref={svgRef} className="cursor-move" />
    </div>
  );
};
