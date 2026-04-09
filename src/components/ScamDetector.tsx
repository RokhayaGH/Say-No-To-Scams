import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, CheckCircle, Info, MessageSquare, Mic, Upload, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { analyzeText, analyzeAudio, AnalysisResult } from '@/services/gemini';

export default function ScamDetector() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleTextAnalysis = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeText(text);
      setResult(res);
    } catch (err) {
      setError('Failed to analyze the message. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioAnalysis(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAudioAnalysis(file);
    }
  };

  const handleAudioAnalysis = async (blob: Blob) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const res = await analyzeAudio(base64Audio, blob.type);
        setResult(res);
        setIsAnalyzing(false);
      };
    } catch (err) {
      setError('Failed to analyze the audio. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setText('');
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4"
        >
          <Shield className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Say No to Scams</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Protect yourself from online fraud. Analyze suspicious messages or voice notes using advanced AI detection.
        </p>
      </header>

      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="text" className="py-3">
            <MessageSquare className="w-4 h-4 mr-2" />
            Analyze Message
          </TabsTrigger>
          <TabsTrigger value="audio" className="py-3">
            <Mic className="w-4 h-4 mr-2" />
            Analyze Voice Note
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Message Analysis</CardTitle>
              <CardDescription>Paste the suspicious text message, email, or job listing below. We'll look for signs of fraud, phishing, and deceptive job offers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Example: 'Congratulations! You have been selected for a remote data entry job. Pay is $50/hr. Please pay $100 for your training kit...'"
                className="min-h-[200px] text-lg resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={reset} disabled={isAnalyzing}>Clear</Button>
              <Button 
                onClick={handleTextAnalysis} 
                disabled={isAnalyzing || !text.trim()}
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Run Detection'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="audio">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Audio Analysis</CardTitle>
              <CardDescription>Record a voice note or upload an audio file to check for deepfakes or deceptive intent.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-8">
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  variant={isRecording ? "destructive" : "default"}
                  className="rounded-full w-24 h-24 flex flex-col gap-1"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isAnalyzing}
                >
                  {isRecording ? (
                    <>
                      <div className="w-4 h-4 bg-white rounded-sm animate-pulse" />
                      <span className="text-[10px] uppercase font-bold">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8" />
                      <span className="text-[10px] uppercase font-bold">Record</span>
                    </>
                  )}
                </Button>

                <div className="relative">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleAudioUpload}
                    disabled={isAnalyzing || isRecording}
                  />
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="rounded-full w-24 h-24 flex flex-col gap-1"
                    disabled={isAnalyzing || isRecording}
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-[10px] uppercase font-bold">Upload</span>
                  </Button>
                </div>
              </div>

              {isAnalyzing && (
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground animate-pulse">Analyzing audio patterns and voice authenticity...</p>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="max-w-md">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8"
          >
            <Card className={`border-2 ${
              result.riskLevel === 'High' ? 'border-destructive/50 bg-destructive/5' : 
              result.riskLevel === 'Medium' ? 'border-orange-500/50 bg-orange-500/5' : 
              'border-green-500/50 bg-green-500/5'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-2xl">Analysis Result</CardTitle>
                  <CardDescription>Based on AI pattern recognition</CardDescription>
                </div>
                <Badge className={`text-lg px-4 py-1 ${
                  result.riskLevel === 'High' ? 'bg-destructive hover:bg-destructive' : 
                  result.riskLevel === 'Medium' ? 'bg-orange-500 hover:bg-orange-500' : 
                  'bg-green-500 hover:bg-green-500'
                }`}>
                  {result.riskLevel} Risk
                </Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Risk Score</span>
                    <span>{result.score}%</span>
                  </div>
                  <Progress value={result.score} className="h-2" />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center">
                      <Info className="w-4 h-4 mr-2 text-primary" />
                      Key Findings
                    </h4>
                    <ul className="space-y-2">
                      {result.findings.map((finding, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                    {result.isDeepfake && (
                      <Alert className="bg-destructive/10 border-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertTitle className="text-destructive">Deepfake Detected</AlertTitle>
                        <AlertDescription className="text-destructive/80">
                          This audio shows significant signs of being synthetically generated by AI.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                      Recommendation
                    </h4>
                    <p className="text-sm leading-relaxed p-4 bg-background rounded-lg border">
                      {result.recommendation}
                    </p>
                    <Button variant="outline" className="w-full" onClick={reset}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Analyze Another
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-16 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Why This Matters</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Scams are becoming more sophisticated. From AI-generated voice notes to fake job listings, 
            vulnerable individuals are being targeted every day. Our goal is to provide tools that 
            empower you to verify reality and stay safe online.
          </p>
        </div>

        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold">Common Scam Red Flags</h2>
          <p className="text-muted-foreground">Stay informed and protect your community.</p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Urgency & Pressure",
              desc: "Scammers often create a fake crisis to make you act without thinking.",
              icon: AlertTriangle
            },
            {
              title: "Unusual Payments",
              desc: "Requests for gift cards, crypto, or wire transfers are major red flags.",
              icon: RefreshCw
            },
            {
              title: "Too Good to Be True",
              desc: "High-paying jobs with no experience or unexpected lottery wins.",
              icon: CheckCircle
            }
          ].map((tip, i) => (
            <Card key={i} className="bg-muted/50 border-none">
              <CardHeader>
                <tip.icon className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-lg">{tip.title}</CardTitle>
                <CardDescription>{tip.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mt-20 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>© 2026 Say No to Scams - AI for Social Good Prototype</p>
        <p className="mt-2">This tool is for educational purposes. Always verify identity through official channels.</p>
      </footer>
    </div>
  );
}
