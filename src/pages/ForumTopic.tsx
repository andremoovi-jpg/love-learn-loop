import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  MessageCircle,
  Heart,
  Eye,
  CheckCircle,
  Pin,
  Lock,
  Shield,
  Award,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DOMPurify from "dompurify";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  title: string;
  content: string;
  author_id: string;
  views_count: number;
  replies_count: number;
  likes_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  created_at: string;
  author: Profile;
  category: Category;
  community: Community;
}

interface Reply {
  id: string;
  content: string;
  author_id: string;
  is_solution: boolean;
  likes_count: number;
  created_at: string;
  author: Profile;
}

export default function ForumTopic() {
  const { slug, topicSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (user && slug && topicSlug) {
      loadTopic();
      incrementViews();
    }
  }, [user, slug, topicSlug]);

  const loadTopic = async () => {
    try {
      // Load topic
      const { data: topicData, error: topicError } = await supabase
        .from("forum_topics")
        .select(
          `
          *,
          author:profiles!author_id(id, user_id, full_name, avatar_url),
          category:community_categories(id, name, color, icon),
          community:communities(id, name, slug)
        `
        )
        .eq("slug", topicSlug)
        .single();

      if (topicError) throw topicError;
      if (!topicData) {
        toast.error("Tópico não encontrado");
        navigate(`/comunidade/${slug}`);
        return;
      }

      setTopic(topicData as unknown as Topic);

      // Check if user is member
      const { data: memberData } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", topicData.community_id)
        .eq("user_id", user?.id)
        .single();

      if (memberData) {
        setIsMember(true);
        setIsModerator(memberData.role === "moderator" || memberData.role === "admin");
      }

      // Load replies
      const { data: repliesData, error: repliesError } = await supabase
        .from("forum_replies")
        .select(
          `
          *,
          author:profiles!author_id(id, user_id, full_name, avatar_url)
        `
        )
        .eq("topic_id", topicData.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;
      setReplies((repliesData as unknown as Reply[]) || []);

      // Check if user liked
      if (user) {
        const { data: likeData } = await supabase
          .from("forum_reactions")
          .select("id")
          .eq("topic_id", topicData.id)
          .eq("user_id", user.id)
          .eq("reaction_type", "like")
          .maybeSingle();

        setUserLiked(!!likeData);
      }
    } catch (error: any) {
      console.error("Error loading topic:", error);
      toast.error("Erro ao carregar tópico");
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    if (!topicSlug) return;
    
    const { data: topicData } = await supabase
      .from("forum_topics")
      .select("id")
      .eq("slug", topicSlug)
      .single();

    if (topicData) {
      await supabase.rpc("increment_topic_views", { topic_id_param: topicData.id });
    }
  };

  const handleAddReply = async () => {
    if (!user || !topic || !newReply.trim()) {
      toast.error("Por favor, escreva uma resposta");
      return;
    }

    if (!isMember) {
      toast.error("Você precisa ser membro desta comunidade");
      return;
    }

    if (newReply.length > 10000) {
      toast.error("Resposta muito longa. Máximo 10.000 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedContent = DOMPurify.sanitize(newReply);

      const { data, error } = await supabase
        .from("forum_replies")
        .insert({
          topic_id: topic.id,
          author_id: user.id,
          content: sanitizedContent,
        })
        .select(
          `
          *,
          author:profiles!author_id(id, user_id, full_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;

      setReplies([...replies, data as unknown as Reply]);
      setNewReply("");
      toast.success("Resposta adicionada com sucesso!");
    } catch (error: any) {
      console.error("Error adding reply:", error);
      toast.error("Erro ao adicionar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !topic) return;

    try {
      if (userLiked) {
        // Unlike
        await supabase
          .from("forum_reactions")
          .delete()
          .eq("topic_id", topic.id)
          .eq("user_id", user.id)
          .eq("reaction_type", "like");

        setTopic({ ...topic, likes_count: topic.likes_count - 1 });
        setUserLiked(false);
      } else {
        // Like
        await supabase.from("forum_reactions").insert({
          topic_id: topic.id,
          user_id: user.id,
          reaction_type: "like",
        });

        setTopic({ ...topic, likes_count: topic.likes_count + 1 });
        setUserLiked(true);
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast.error("Erro ao curtir");
    }
  };

  const handleMarkAsSolution = async (replyId: string) => {
    if (!user || !topic) return;

    if (topic.author_id !== user.id) {
      toast.error("Apenas o autor do tópico pode marcar soluções");
      return;
    }

    try {
      // Mark reply as solution
      await supabase
        .from("forum_replies")
        .update({ is_solution: true })
        .eq("id", replyId);

      // Mark topic as solved
      await supabase
        .from("forum_topics")
        .update({ is_solved: true, solved_reply_id: replyId })
        .eq("id", topic.id);

      // Update local state
      setTopic({ ...topic, is_solved: true });
      setReplies(
        replies.map((r) =>
          r.id === replyId ? { ...r, is_solution: true } : r
        )
      );

      toast.success("Resposta marcada como solução!");
    } catch (error: any) {
      console.error("Error marking solution:", error);
      toast.error("Erro ao marcar solução");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return;

    try {
      await supabase
        .from("forum_replies")
        .update({ status: "deleted" })
        .eq("id", replyId);

      setReplies(replies.filter((r) => r.id !== replyId));
      toast.success("Resposta deletada");
    } catch (error: any) {
      console.error("Error deleting reply:", error);
      toast.error("Erro ao deletar resposta");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Carregando tópico...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!topic) return null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to={`/comunidade/${slug}`}
              className="hover:text-foreground transition-base"
            >
              {topic.community.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span
              className="inline-flex items-center gap-1"
              style={{ color: topic.category.color }}
            >
              <span>{topic.category.icon}</span>
              {topic.category.name}
            </span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{topic.title}</span>
          </div>

          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/comunidade/${slug}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para comunidade
          </Button>

          {/* Topic Card */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{topic.title}</h1>
                    {topic.is_pinned && (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="w-3 h-3" />
                        Fixado
                      </Badge>
                    )}
                    {topic.is_locked && (
                      <Badge variant="destructive" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Fechado
                      </Badge>
                    )}
                    {topic.is_solved && (
                      <Badge
                        className="gap-1 bg-success text-success-foreground"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Resolvido
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {topic.views_count} visualizações
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {topic.replies_count} respostas
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {topic.likes_count} curtidas
                    </div>
                  </div>
                </div>

                <Button
                  variant={userLiked ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleLike}
                  className="shrink-0"
                >
                  <Heart
                    className={`w-4 h-4 ${userLiked ? "fill-current" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Author info */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={topic.author.avatar_url || undefined} />
                  <AvatarFallback>
                    {topic.author.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{topic.author.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(topic.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Topic content */}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(topic.content),
                }}
              />
            </CardContent>
          </Card>

          {/* Replies Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {replies.length} Resposta{replies.length !== 1 ? "s" : ""}
            </h2>

            {replies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={reply.author.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {reply.author.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {reply.author.full_name}
                          </p>
                          {reply.is_solution && (
                            <Badge className="gap-1 bg-success text-success-foreground">
                              <CheckCircle className="w-3 h-3" />
                              Solução
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(reply.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    {(user?.id === reply.author_id ||
                      user?.id === topic.author_id ||
                      isModerator) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user?.id === topic.author_id &&
                            !topic.is_solved &&
                            !reply.is_solution && (
                              <DropdownMenuItem
                                onClick={() => handleMarkAsSolution(reply.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como Solução
                              </DropdownMenuItem>
                            )}
                          {(user?.id === reply.author_id ||
                            isModerator) && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-danger"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <Separator />

                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(reply.content),
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Reply Form */}
          {isMember && !topic.is_locked && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Adicionar Resposta</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Escreva sua resposta..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {newReply.length} / 10.000 caracteres
                  </p>
                  <Button
                    onClick={handleAddReply}
                    disabled={submitting || !newReply.trim()}
                  >
                    {submitting ? "Enviando..." : "Responder"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {topic.is_locked && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 text-center">
                <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Este tópico está fechado e não aceita mais respostas
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
