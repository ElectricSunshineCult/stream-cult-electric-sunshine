import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Save, 
  Download, 
  Camera, 
  Clock, 
  RotateCcw,
  Settings,
  CheckCircle,
  AlertCircle,
  Timer,
  FileVideo,
  Upload
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StreamClipperProps {
  streamId?: string;
  onClipSave?: (clip: any) => void;
  onClipSelect?: (startTime: number, endTime: number) => void;
  isStreaming?: boolean;
  streamUrl?: string;
}

interface Clip {
  id?: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  file?: File;
  tags: string[];
  isPublic: boolean;
  quality: string;
}

const StreamClipper: React.FC<StreamClipperProps> = ({
  streamId,
  onClipSave,
  onClipSelect,
  isStreaming = false,
  streamUrl
}) => {
  // Video and recording states
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Component states
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  
  // Clip management states
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<number>(-1);
  const [isUploading, setIsUploading] = useState(false);
  
  // New clip form
  const [newClip, setNewClip] = useState<Clip>({
    title: '',
    description: '',
    startTime: 0,
    endTime: 0,
    duration: 0,
    tags: [],
    isPublic: false,
    quality: '1080p'
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isCreatingClip, setIsCreatingClip] = useState(false);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoSource]);

  // Load stream or video
  useEffect(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.src = streamUrl;
      setVideoSource(streamUrl);
    }
  }, [streamUrl]);

  const playPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = time;
    setCurrentTime(time);
  };

  const setMark = () => {
    setNewClip(prev => ({
      ...prev,
      endTime: currentTime,
      duration: currentTime - prev.startTime
    }));
  };

  const startMark = () => {
    setNewClip(prev => ({
      ...prev,
      startTime: currentTime
    }));
    toast({
      title: "Start Mark Set",
      description: `Start time set to ${formatTime(currentTime)}`
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Start recording the canvas
          const canvasStream = canvas.captureStream(30); // 30 FPS
          const audioStream = stream.getAudioTracks()[0];
          
          if (audioStream) {
            canvasStream.addTrack(audioStream);
          }
          
          mediaRecorderRef.current = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
          });
          
          chunksRef.current = [];
          
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const file = new File([blob], `clip-${Date.now()}.webm`, { type: 'video/webm' });
            
            setNewClip(prev => ({ ...prev, file }));
            
            toast({
              title: "Recording Complete",
              description: "Clip has been recorded successfully"
            });
          };
          
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setRecordingStatus('recording');
          
          toast({
            title: "Recording Started",
            description: "Your clip is being recorded"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStatus('stopped');
      
      // Clean up stream
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Clip management
  const saveClip = async () => {
    if (!newClip.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your clip",
        variant: "destructive"
      });
      return;
    }

    if (newClip.duration <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Please set start and end times for your clip",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      if (newClip.file) {
        formData.append('video', newClip.file);
      }
      
      formData.append('title', newClip.title);
      formData.append('description', newClip.description);
      formData.append('startTime', newClip.startTime.toString());
      formData.append('endTime', newClip.endTime.toString());
      formData.append('quality', newClip.quality);
      formData.append('isPublic', newClip.isPublic.toString());
      formData.append('tags', newClip.tags.join(','));
      
      if (streamId) {
        formData.append('streamId', streamId);
      }

      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save clip');
      }

      const result = await response.json();
      
      // Add to local clips list
      const savedClip = { ...newClip, id: result.clip.id };
      setClips(prev => [savedClip, ...prev]);
      
      // Reset form
      setNewClip({
        title: '',
        description: '',
        startTime: 0,
        endTime: 0,
        duration: 0,
        file: undefined,
        tags: [],
        isPublic: false,
        quality: '1080p'
      });
      setTagInput('');
      
      toast({
        title: "Clip Saved",
        description: "Your clip has been saved to your profile"
      });
      
      if (onClipSave) {
        onClipSave(result.clip);
      }
      
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save clip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadClip = (clip: Clip) => {
    if (clip.file) {
      const url = URL.createObjectURL(clip.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clip.title || 'clip'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your clip is being downloaded"
      });
    } else {
      toast({
        title: "Download Failed",
        description: "Clip file not found",
        variant: "destructive"
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newClip.tags.includes(tagInput.trim())) {
      setNewClip(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setNewClip(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const clearClip = () => {
    setNewClip({
      title: '',
      description: '',
      startTime: 0,
      endTime: 0,
      duration: 0,
      file: undefined,
      tags: [],
      isPublic: false,
      quality: '1080p'
    });
    setTagInput('');
    setSelectedClip(-1);
  };

  return (
    <div className="space-y-6">
      {/* Video Player and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Stream Clipper
          </CardTitle>
          <CardDescription>
            Record and edit clips from your stream
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Display */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-contain"
              controls={false}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ display: 'none' }}
            />
          </div>

          {/* Video Controls */}
          <div className="space-y-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                onClick={playPause}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Time Scrubber */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Mark Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={startMark}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Set Start ({formatTime(currentTime)})
              </Button>
              
              <Button
                onClick={setMark}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Set End ({formatTime(currentTime)})
              </Button>
              
              <Button
                onClick={clearClip}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={!videoSource}
                  className="flex items-center gap-2"
                >
                  <Timer className="w-4 h-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </Button>
              )}
              
              {recordingStatus === 'recording' && (
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Recording
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clip Creation Form */}
      {(newClip.startTime > 0 || newClip.file) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              Create Clip
            </CardTitle>
            <CardDescription>
              Configure and save your clip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Clip Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newClip.title}
                  onChange={(e) => setNewClip(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter clip title..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <select
                  id="quality"
                  value={newClip.quality}
                  onChange={(e) => setNewClip(prev => ({ ...prev, quality: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newClip.description}
                onChange={(e) => setNewClip(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your clip..."
                rows={3}
              />
            </div>

            {/* Clip Timing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formatTime(newClip.startTime)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formatTime(newClip.endTime)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="p-2 bg-muted rounded-md text-sm font-semibold">
                  {formatDuration(newClip.duration)}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tags..."
                />
                <Button onClick={addTag} size="sm">Add</Button>
              </div>
              
              {newClip.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newClip.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={newClip.isPublic}
                onChange={(e) => setNewClip(prev => ({ ...prev, isPublic: e.target.checked }))}
              />
              <Label htmlFor="isPublic">Make this clip public</Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={saveClip}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <Upload className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isUploading ? 'Saving...' : 'Save to Profile'}
              </Button>
              
              {newClip.file && (
                <Button
                  onClick={() => downloadClip(newClip)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clips List */}
      {clips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Saved Clips ({clips.length})
            </CardTitle>
            <CardDescription>
              Your recently created clips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clips.map((clip, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{clip.title || 'Untitled Clip'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(clip.duration)} • {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    </p>
                    {clip.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {clip.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => seekTo(clip.startTime)}
                      variant="outline"
                      size="sm"
                    >
                      Preview
                    </Button>
                    
                    <Button
                      onClick={() => downloadClip(clip)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StreamClipper;