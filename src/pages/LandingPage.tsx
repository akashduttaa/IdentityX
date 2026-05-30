import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Fingerprint,
  Zap,
  Globe,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Key,
  Database,
  Brain,
  Wallet,
} from 'lucide-react';
import { statsService } from '../lib/stats.service';

// Floating particles background
function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const pos = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  });

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#6C63FF"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

// Animated mesh gradient sphere
function GradientSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[2, 4]} />
      <meshStandardMaterial
        wireframe
        color="#6C63FF"
        emissive="#6C63FF"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Suspense fallback={null}>
        <ParticleField />
        <GradientSphere />
      </Suspense>
    </Canvas>
  );
}

// Animated counter
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function LandingPage() {
  const [stats, setStats] = useState<any>(null);
  const [morphText, setMorphText] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  const morphTexts = ['Your Identity', 'Your Privacy', 'Your Control', 'Your Future'];

  useEffect(() => {
    const interval = setInterval(() => {
      setMorphText((prev) => (prev + 1) % morphTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    statsService.getPlatformStats().then(setStats).catch(console.error);
  }, []);

  const features = [
    {
      icon: Shield,
      title: 'Self-Sovereign Identity',
      description: 'Own and control your digital identity without relying on centralized providers.',
    },
    {
      icon: Lock,
      title: 'Zero-Knowledge Proofs',
      description: 'Prove claims without revealing sensitive data. Verify age without showing ID.',
    },
    {
      icon: Fingerprint,
      title: 'DID on Blockchain',
      description: 'Your Decentralized Identifier anchored on Polygon for immutability and trust.',
    },
    {
      icon: Brain,
      title: 'AI Trust Scoring',
      description: 'Machine learning detects anomalies and scores credential trustworthiness.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Create Your DID',
      description: 'Register and generate a unique decentralized identifier anchored on blockchain.',
      icon: Key,
    },
    {
      num: '02',
      title: 'Get Credentials',
      description: 'Receive verifiable credentials from trusted issuers like universities and banks.',
      icon: Database,
    },
    {
      num: '03',
      title: 'Generate Proofs',
      description: 'Create zero-knowledge proofs to verify claims without exposing data.',
      icon: Shield,
    },
    {
      num: '04',
      title: 'Verify Anywhere',
      description: 'Instantly verify identity claims across services while maintaining privacy.',
      icon: CheckCircle2,
    },
  ];

  const statsData = stats || {
    total_dids: 2847,
    total_credentials: 12543,
    total_verifications: 45892,
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0">
          <HeroCanvas />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-950/0 via-dark-950/50 to-dark-950" />
        </div>

        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-mesh opacity-50" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-8"
            >
              <Sparkles className="w-4 h-4" />
              Powered by Blockchain & Zero-Knowledge Cryptography
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-gray-100 mb-6"
            >
              <span className="block">Take Back Control of</span>
              <span className="gradient-text min-h-[1.2em] block">
                {morphTexts[morphText]}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              IdentityChain empowers you with self-sovereign identity. Create verifiable credentials,
              prove claims with zero-knowledge proofs, and maintain complete privacy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/register"
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/verify"
                className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-4"
              >
                <Shield className="w-5 h-5" />
                Verify a Proof
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 rounded-full border-2 border-gray-600 flex items-start justify-center p-1"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-primary-500 rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'DIDs Created', value: statsData.total_dids, icon: Users },
              { label: 'Credentials Issued', value: statsData.total_credentials, icon: Database },
              { label: 'Verifications', value: statsData.total_verifications, icon: CheckCircle2 },
              { label: 'Trust Score', value: 98, suffix: '%', icon: Shield },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="stat-card text-center"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-4 text-primary-400" />
                <div className="stat-value">
                  <AnimatedCounter target={stat.value} />
                  {stat.suffix}
                </div>
                <p className="text-gray-400 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-gray-100 mb-4">
              Built for the <span className="gradient-text">Future</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              IdentityChain combines cutting-edge technologies to give you complete control over your digital identity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-8 tilt-card"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-2xl font-display font-semibold text-gray-100 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 bg-dark-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-gray-100 mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get started in minutes with our simple four-step process.
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-secondary-500 to-accent-500 hidden md:block" />

            <div className="space-y-12 md:space-y-0">
              {steps.map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className={`relative flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="glass-card p-6 inline-block">
                      <span className="text-5xl font-display font-bold gradient-text">{step.num}</span>
                      <h3 className="text-2xl font-display font-semibold text-gray-100 mt-2 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-400">{step.description}</p>
                    </div>
                  </div>

                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 gradient-border"
          >
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-gray-100 mb-4">
              Ready to Own Your Identity?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of users who have taken control of their digital identity with IdentityChain.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
              >
                <Wallet className="w-5 h-5" />
                Create Your DID
              </Link>
              <a
                href="#"
                className="text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="relative py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            Built with love by{' '}
            <span className="text-primary-400 font-semibold">Team DevOrbit</span>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Hackathon 2024
          </p>
        </div>
      </section>

      {/* Demo Terminal */}
      <section className="relative py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold text-gray-100 mb-4">
              See It In Action
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="terminal"
          >
            <div className="terminal-header">
              <div className="terminal-dot bg-error-500" />
              <div className="terminal-dot bg-warning-500" />
              <div className="terminal-dot bg-success-500" />
              <span className="ml-4 text-gray-500 text-xs">identitychain-cli</span>
            </div>
            <div className="terminal-body font-mono text-left">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-secondary-500">$</span>
                  <span className="text-gray-300">identitychain create-did</span>
                </div>
                <div className="text-gray-400 pl-4">
                  <span className="text-primary-400">✓</span> DID created: did:ethr:0x7a3b...9f2c
                </div>
                <div className="flex gap-2">
                  <span className="text-secondary-500">$</span>
                  <span className="text-gray-300">identitychain issue-credential --type KYC</span>
                </div>
                <div className="text-gray-400 pl-4">
                  <span className="text-primary-400">✓</span> Credential issued: vc_8x7k...3m2n
                </div>
                <div className="text-gray-400 pl-4">
                  <span className="text-primary-400">✓</span> Stored on IPFS: QmX9...2kL
                </div>
                <div className="flex gap-2">
                  <span className="text-secondary-500">$</span>
                  <span className="text-gray-300">identitychain generate-proof --claim age_gte_18</span>
                </div>
                <div className="text-gray-400 pl-4">
                  <span className="text-primary-400">✓</span> ZK proof generated
                </div>
                <div className="text-gray-400 pl-4">
                  <span className="text-primary-400">✓</span> Verified: True
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
