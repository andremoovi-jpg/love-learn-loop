import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { BarChart3, FolderOpen, Shield, Users, Award, Settings, Plus, Pencil, Trash2, CheckCircle, XCircle, Eye, Ban, UserCog, MessageSquare } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// ============= SCHEMAS =============
const categorySchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  icon: z.string().default("📝"),
  color: z.string().default("#6366f1"),
  sort_order: z.number().int().min(0).default(0),
  is_locked: z.boolean().default(false),
});

const communitySettingsSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  slug: z.string().min(2, "Slug deve ter no mínimo 2 caracteres"),
  settings: z.object({
    allow_posts: z.boolean(),
    allow_anonymous: z.boolean(),
    require_moderation: z.boolean(),
    enable_reactions: z.boolean(),
    enable_badges: z.boolean(),
  }),
  is_active: z.boolean(),
});

const badgeSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  icon_url: z.string().optional(),
  color: z.string().default("#6366f1"),
  criteria: z.object({
    min_posts: z.number().int().min(0).optional(),
    min_solutions: z.number().int().min(0).optional(),
    min_reputation: z.number().int().min(0).optional(),
  }),
  auto_award: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

interface PostWithProfile {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

interface TopicWithProfile {
  id: string;
  title: string;
  content: string;
  author_id: string;
  views_count: number;
  replies_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  community?: {
    name: string;
  };
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export default function AdminComunidades() {
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);
  const [moderationType, setModerationType] = useState<'reports' | 'posts' | 'topics'>('topics');
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const queryClient = useQueryClient();

  // ============= QUERIES =============
  
  // Dashboard metrics
  const { data: metrics } = useQuery({
    queryKey: ['community-metrics'],
    queryFn: async () => {
      const [communities, members, topics, replies] = await Promise.all([
        supabase.from('communities').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('community_members').select('id', { count: 'exact' }),
        supabase.from('forum_topics').select('id', { count: 'exact' }),
        supabase.from('forum_replies').select('id', { count: 'exact' }),
      ]);
      
      return {
        totalCommunities: communities.count || 0,
        totalMembers: members.count || 0,
        totalTopics: topics.count || 0,
        totalReplies: replies.count || 0,
      };
    },
  });

  // Communities list - Only product-linked communities
  const { data: communities } = useQuery({
    queryKey: ['communities-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .not('product_id', 'is', null) // Only communities with product_id
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Categories for selected community
  const { data: categories } = useQuery({
    queryKey: ['community-categories', selectedCommunityId],
    queryFn: async () => {
      if (!selectedCommunityId) return [];
      
      const { data, error } = await supabase
        .from('community_categories')
        .select('*')
        .eq('community_id', selectedCommunityId)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCommunityId,
  });

  // Members for selected community
  const { data: members } = useQuery({
    queryKey: ['community-members', selectedCommunityId],
    queryFn: async () => {
      if (!selectedCommunityId) return [];
      
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', selectedCommunityId)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCommunityId,
  });

  // Reports
  const { data: reports } = useQuery({
    queryKey: ['forum-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_reports')
        .select(`
          *,
          topic:topic_id (title),
          reply:reply_id (content)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Posts para moderação
  const { data: moderationPosts } = useQuery<PostWithProfile[]>({
    queryKey: ['admin-posts-moderation', selectedStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        return data.map(post => ({
          ...post,
          profile: profilesMap.get(post.user_id)
        })) as PostWithProfile[];
      }

      return data as PostWithProfile[] || [];
    },
    enabled: moderationType === 'posts',
  });

  // Tópicos para moderação
  const { data: moderationTopics } = useQuery<TopicWithProfile[]>({
    queryKey: ['admin-topics-moderation', selectedStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_topics')
        .select('*, community:communities(name)')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.author_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        return data.map(topic => ({
          ...topic,
          profile: profilesMap.get(topic.author_id)
        })) as TopicWithProfile[];
      }

      return data as TopicWithProfile[] || [];
    },
    enabled: moderationType === 'topics',
  });

  // Stats de moderação
  const { data: moderationStats } = useQuery({
    queryKey: ['moderation-stats', moderationType],
    queryFn: async () => {
      const table = moderationType === 'posts' ? 'community_posts' : 'forum_topics';
      
      const [pending, approved, rejected] = await Promise.all([
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'approved'),
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'rejected'),
      ]);

      return {
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
      };
    },
    enabled: moderationType !== 'reports',
  });

  // Badges
  const { data: badges } = useQuery({
    queryKey: ['community-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_badges')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
  });

  // Selected community details
  const { data: selectedCommunity } = useQuery({
    queryKey: ['community-detail', selectedCommunityId],
    queryFn: async () => {
      if (!selectedCommunityId) return null;
      
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', selectedCommunityId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCommunityId,
  });

  // ============= MUTATIONS =============
  
  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof categorySchema>) => {
      const { error } = await supabase
        .from('community_categories')
        .insert([{
          name: values.name,
          description: values.description,
          icon: values.icon,
          color: values.color,
          sort_order: values.sort_order,
          is_locked: values.is_locked,
          community_id: selectedCommunityId,
          slug: values.name.toLowerCase().replace(/\s+/g, '-'),
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-categories'] });
      toast.success("Categoria criada com sucesso!");
      setIsCategoryDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar categoria: " + error.message);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof categorySchema> }) => {
      const { error } = await supabase
        .from('community_categories')
        .update(values)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-categories'] });
      toast.success("Categoria atualizada com sucesso!");
      setIsCategoryDialogOpen(false);
      setSelectedCategoryId(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('community_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-categories'] });
      toast.success("Categoria deletada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar categoria: " + error.message);
    },
  });

  // Community settings mutation
  const updateCommunityMutation = useMutation({
    mutationFn: async (values: z.infer<typeof communitySettingsSchema>) => {
      const { error } = await supabase
        .from('communities')
        .update({
          name: values.name,
          description: values.description,
          slug: values.slug,
          settings: values.settings as any,
          is_active: values.is_active,
        })
        .eq('id', selectedCommunityId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities-admin'] });
      queryClient.invalidateQueries({ queryKey: ['community-detail'] });
      toast.success("Comunidade atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar comunidade: " + error.message);
    },
  });

  // Member mutations
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from('community_members')
        .update({ role })
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members'] });
      toast.success("Role atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });

  const banMemberMutation = useMutation({
    mutationFn: async ({ memberId, ban }: { memberId: string; ban: boolean }) => {
      const { error } = await supabase
        .from('community_members')
        .update({ is_banned: ban })
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members'] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // Report mutations
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: string }) => {
      const { error } = await supabase
        .from('forum_reports')
        .update({ 
          status: 'resolved',
          action_taken: action,
          resolved_at: new Date().toISOString()
        })
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-reports'] });
      toast.success("Report resolvido!");
    },
    onError: (error) => {
      toast.error("Erro ao resolver report: " + error.message);
    },
  });

  // Post/Topic moderation mutations
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const table = moderationType === 'posts' ? 'community_posts' : 'forum_topics';
      const status = moderationType === 'posts' ? 'approved' : 'active';
      const { error } = await supabase
        .from(table)
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-topics-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      toast.success(moderationType === 'posts' ? "Post aprovado!" : "Tópico aprovado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const table = moderationType === 'posts' ? 'community_posts' : 'forum_topics';
      const status = moderationType === 'posts' ? 'rejected' : 'hidden';
      const { error } = await supabase
        .from(table)
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-topics-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      toast.success(moderationType === 'posts' ? "Post rejeitado!" : "Tópico rejeitado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });

  // Badge mutations
  const createBadgeMutation = useMutation({
    mutationFn: async (values: z.infer<typeof badgeSchema>) => {
      const { error } = await supabase
        .from('community_badges')
        .insert([{
          name: values.name,
          description: values.description,
          icon_url: values.icon_url,
          color: values.color,
          criteria: values.criteria as any,
          auto_award: values.auto_award,
          sort_order: values.sort_order,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-badges'] });
      toast.success("Badge criado com sucesso!");
      setIsBadgeDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar badge: " + error.message);
    },
  });

  const updateBadgeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof badgeSchema> }) => {
      const { error } = await supabase
        .from('community_badges')
        .update({
          name: values.name,
          description: values.description,
          icon_url: values.icon_url,
          color: values.color,
          criteria: values.criteria as any,
          auto_award: values.auto_award,
          sort_order: values.sort_order,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-badges'] });
      toast.success("Badge atualizado com sucesso!");
      setIsBadgeDialogOpen(false);
      setSelectedBadgeId(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar badge: " + error.message);
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('community_badges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-badges'] });
      toast.success("Badge deletado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao deletar badge: " + error.message);
    },
  });

  // ============= FORMS =============
  
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "📝",
      color: "#6366f1",
      sort_order: 0,
      is_locked: false,
    },
  });

  const communityForm = useForm<z.infer<typeof communitySettingsSchema>>({
    resolver: zodResolver(communitySettingsSchema),
    values: selectedCommunity ? {
      name: selectedCommunity.name,
      description: selectedCommunity.description || "",
      slug: selectedCommunity.slug,
      settings: (typeof selectedCommunity.settings === 'object' && selectedCommunity.settings !== null
        ? selectedCommunity.settings 
        : {
          allow_posts: true,
          allow_anonymous: false,
          require_moderation: false,
          enable_reactions: true,
          enable_badges: true,
        }) as {
          allow_posts: boolean;
          allow_anonymous: boolean;
          require_moderation: boolean;
          enable_reactions: boolean;
          enable_badges: boolean;
        },
      is_active: selectedCommunity.is_active,
    } : undefined,
  });

  const badgeForm = useForm<z.infer<typeof badgeSchema>>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: "",
      description: "",
      icon_url: "",
      color: "#6366f1",
      criteria: {
        min_posts: 0,
        min_solutions: 0,
        min_reputation: 0,
      },
      auto_award: true,
      sort_order: 0,
    },
  });

  // ============= RENDER =============
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Comunidades</h1>
        <p className="text-muted-foreground mt-2">
          Administre categorias, membros, moderação e badges das comunidades
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Moderação</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Membros</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Comunidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalCommunities || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalMembers || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Tópicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalTopics || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalReplies || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Comunidades Ativas</CardTitle>
              <CardDescription>Ranking de atividade das comunidades</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communities?.map((community) => (
                    <TableRow key={community.id}>
                      <TableCell className="font-medium">{community.name}</TableCell>
                      <TableCell>{community.member_count}</TableCell>
                      <TableCell>{community.post_count}</TableCell>
                      <TableCell>
                        <Badge variant={community.is_active ? "default" : "secondary"}>
                          {community.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: CATEGORIAS */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Categorias</CardTitle>
                  <CardDescription>Organize as categorias das comunidades</CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        categoryForm.reset();
                        setSelectedCategoryId(null);
                      }}
                      disabled={!selectedCommunityId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedCategoryId ? "Editar Categoria" : "Nova Categoria"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit((values) => {
                        if (selectedCategoryId) {
                          updateCategoryMutation.mutate({ id: selectedCategoryId, values });
                        } else {
                          createCategoryMutation.mutate(values);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={categoryForm.control}
                            name="icon"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ícone (Emoji)</FormLabel>
                                <FormControl>
                                  <Input {...field} maxLength={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={categoryForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={categoryForm.control}
                          name="sort_order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ordem de Exibição</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={categoryForm.control}
                          name="is_locked"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Categoria Bloqueada</FormLabel>
                                <FormDescription>
                                  Apenas moderadores podem criar tópicos
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="submit">
                            {selectedCategoryId ? "Atualizar" : "Criar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecionar Comunidade</Label>
                <Select value={selectedCommunityId} onValueChange={setSelectedCommunityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma comunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities?.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCommunityId && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ícone</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <span style={{ color: category.color }} className="text-xl">
                            {category.icon}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">{category.description}</TableCell>
                        <TableCell>{category.sort_order}</TableCell>
                        <TableCell>
                          <Badge variant={category.is_locked ? "destructive" : "default"}>
                            {category.is_locked ? "Bloqueada" : "Aberta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                categoryForm.reset({
                                  name: category.name,
                                  description: category.description || "",
                                  icon: category.icon || "📝",
                                  color: category.color || "#6366f1",
                                  sort_order: category.sort_order || 0,
                                  is_locked: category.is_locked || false,
                                });
                                setIsCategoryDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Categoria?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Todos os tópicos desta categoria serão mantidos sem categoria.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                                  >
                                    Deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: MODERAÇÃO */}
        <TabsContent value="moderation" className="space-y-6">
          {/* Seletor de Tipo de Moderação */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Moderação de Conteúdo</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie posts, tópicos e reports da comunidade
              </p>
            </div>
            <Select value={moderationType} onValueChange={(v) => setModerationType(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topics">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Tópicos do Fórum
                  </div>
                </SelectItem>
                <SelectItem value="posts">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Posts Gerais
                  </div>
                </SelectItem>
                <SelectItem value="reports">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 w-4" />
                    Reports
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats de Moderação para Posts/Topics */}
          {moderationType !== 'reports' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderationStats?.pending || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderationStats?.approved || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{moderationStats?.rejected || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Content baseado no tipo de moderação */}
          {moderationType === 'reports' ? (
            <Card>
              <CardHeader>
                <CardTitle>Reports Pendentes</CardTitle>
                <CardDescription>Denúncias de conteúdo impróprio</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {report.topic_id ? "Tópico" : "Resposta"}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              report.status === 'pending' ? "secondary" :
                              report.status === 'resolved' ? "default" : "destructive"
                            }
                          >
                            {report.status === 'pending' ? "Pendente" : 
                             report.status === 'resolved' ? "Resolvido" : report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {report.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resolveReportMutation.mutate({ 
                                  reportId: report.id, 
                                  action: 'approved' 
                                })}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resolveReportMutation.mutate({ 
                                  reportId: report.id, 
                                  action: 'content_removed' 
                                })}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tabs para filtrar por status */}
              <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pendentes ({moderationStats?.pending || 0})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Aprovados ({moderationStats?.approved || 0})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    Rejeitados ({moderationStats?.rejected || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={selectedStatus} className="space-y-4 mt-4">
                  {moderationType === 'topics' && moderationTopics && moderationTopics.length > 0 ? (
                    moderationTopics.map((topic) => (
                      <Card key={topic.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={topic.profile?.avatar_url} />
                              <AvatarFallback>
                                {topic.profile?.full_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold">{topic.profile?.full_name || 'Usuário'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {topic.community?.name || 'Comunidade'}
                                  </p>
                                </div>
                                {selectedStatus === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => approveMutation.mutate(topic.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aprovar
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Rejeitar
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Rejeitar Tópico?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Este tópico será rejeitado e o autor será notificado.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => rejectMutation.mutate(topic.id)}
                                          >
                                            Rejeitar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>

                              <h3 className="font-bold text-lg mb-2">{topic.title}</h3>
                              <p className="text-muted-foreground line-clamp-3 mb-4">
                                {topic.content}
                              </p>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  {topic.views_count}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  {topic.replies_count}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : moderationType === 'posts' && moderationPosts && moderationPosts.length > 0 ? (
                    moderationPosts.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={post.profile?.avatar_url} />
                              <AvatarFallback>
                                {post.profile?.full_name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-semibold">{post.profile?.full_name || 'Usuário'}</p>
                                {selectedStatus === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => approveMutation.mutate(post.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Aprovar
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Rejeitar
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Rejeitar Post?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Este post será rejeitado e o autor será notificado.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => rejectMutation.mutate(post.id)}
                                          >
                                            Rejeitar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>

                              <p className="text-muted-foreground mb-4">{post.content}</p>
                              {post.image_url && (
                                <img src={post.image_url} alt="Post" className="rounded-lg max-w-sm mb-4" />
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{post.likes_count} curtidas</span>
                                <span>{post.comments_count} comentários</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        Nenhum conteúdo {selectedStatus === 'pending' ? 'pendente' : selectedStatus === 'approved' ? 'aprovado' : 'rejeitado'} no momento.
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>

        {/* ABA 4: MEMBROS */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Membros</CardTitle>
              <CardDescription>Visualize e gerencie membros das comunidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecionar Comunidade</Label>
                <Select value={selectedCommunityId} onValueChange={setSelectedCommunityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma comunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities?.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCommunityId && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Respostas</TableHead>
                      <TableHead>Soluções</TableHead>
                      <TableHead>Reputação</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members?.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.full_name || "Usuário"}
                        </TableCell>
                        <TableCell>{member.posts_count}</TableCell>
                        <TableCell>{member.replies_count}</TableCell>
                        <TableCell>{member.solutions_count}</TableCell>
                        <TableCell>{member.reputation_points}</TableCell>
                        <TableCell>
                          <Badge variant={
                            member.role === 'admin' ? "default" :
                            member.role === 'moderator' ? "secondary" : "outline"
                          }>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_banned ? "destructive" : "default"}>
                            {member.is_banned ? "Banido" : "Ativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(value) => 
                                updateMemberRoleMutation.mutate({ 
                                  memberId: member.id, 
                                  role: value 
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              size="sm"
                              variant={member.is_banned ? "default" : "destructive"}
                              onClick={() => 
                                banMemberMutation.mutate({ 
                                  memberId: member.id, 
                                  ban: !member.is_banned 
                                })
                              }
                            >
                              {member.is_banned ? <UserCog className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5: BADGES */}
        <TabsContent value="badges" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurações de Badges</CardTitle>
                  <CardDescription>Gerencie badges e recompensas da comunidade</CardDescription>
                </div>
                <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        badgeForm.reset();
                        setSelectedBadgeId(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedBadgeId ? "Editar Badge" : "Novo Badge"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...badgeForm}>
                      <form onSubmit={badgeForm.handleSubmit((values) => {
                        if (selectedBadgeId) {
                          updateBadgeMutation.mutate({ id: selectedBadgeId, values });
                        } else {
                          createBadgeMutation.mutate(values);
                        }
                      })} className="space-y-4">
                        <FormField
                          control={badgeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={badgeForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={badgeForm.control}
                            name="icon_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL do Ícone</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={badgeForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Critérios Automáticos</Label>
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={badgeForm.control}
                              name="criteria.min_posts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Min. Posts</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={badgeForm.control}
                              name="criteria.min_solutions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Min. Soluções</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={badgeForm.control}
                              name="criteria.min_reputation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Min. Reputação</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <FormField
                          control={badgeForm.control}
                          name="auto_award"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Auto-atribuir</FormLabel>
                                <FormDescription>
                                  Conceder automaticamente quando critérios forem atingidos
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={badgeForm.control}
                          name="sort_order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ordem de Exibição</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="submit">
                            {selectedBadgeId ? "Atualizar" : "Criar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Critérios</TableHead>
                    <TableHead>Auto</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badges?.map((badge) => (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: badge.color + '20', color: badge.color }}
                          >
                            🏆
                          </div>
                          <span className="font-medium">{badge.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{badge.description}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {typeof badge.criteria === 'object' && badge.criteria !== null && 'min_posts' in badge.criteria && (
                            <div>Posts: {(badge.criteria as any).min_posts}+</div>
                          )}
                          {typeof badge.criteria === 'object' && badge.criteria !== null && 'min_solutions' in badge.criteria && (
                            <div>Soluções: {(badge.criteria as any).min_solutions}+</div>
                          )}
                          {typeof badge.criteria === 'object' && badge.criteria !== null && 'min_reputation' in badge.criteria && (
                            <div>Rep: {(badge.criteria as any).min_reputation}+</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.auto_award ? "default" : "secondary"}>
                          {badge.auto_award ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell>{badge.sort_order}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedBadgeId(badge.id);
                              badgeForm.reset({
                                name: badge.name,
                                description: badge.description || "",
                                icon_url: badge.icon_url || "",
                                color: badge.color || "#6366f1",
                                criteria: (typeof badge.criteria === 'object' && badge.criteria !== null 
                                  ? badge.criteria 
                                  : { min_posts: 0, min_solutions: 0, min_reputation: 0 }) as any,
                                auto_award: badge.auto_award ?? true,
                                sort_order: badge.sort_order || 0,
                              });
                              setIsBadgeDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar Badge?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O badge será removido de todos os usuários.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBadgeMutation.mutate(badge.id)}
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6: CONFIGURAÇÕES */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Configure as opções da comunidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecionar Comunidade</Label>
                <Select value={selectedCommunityId} onValueChange={setSelectedCommunityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma comunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities?.map((community) => (
                      <SelectItem key={community.id} value={community.id}>
                        {community.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCommunityId && selectedCommunity && (
                <Form {...communityForm}>
                  <form onSubmit={communityForm.handleSubmit((values) => {
                    updateCommunityMutation.mutate(values);
                  })} className="space-y-6">
                    <FormField
                      control={communityForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Comunidade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={communityForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug (URL)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Usado na URL: /comunidade/[slug]
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Configurações</Label>
                      
                      <FormField
                        control={communityForm.control}
                        name="settings.allow_posts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Permitir Posts</FormLabel>
                              <FormDescription>
                                Membros podem criar novos tópicos
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="settings.allow_anonymous"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Permitir Anônimos</FormLabel>
                              <FormDescription>
                                Membros podem postar anonimamente
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="settings.require_moderation"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Requerer Moderação</FormLabel>
                              <FormDescription>
                                Posts precisam ser aprovados antes de serem publicados
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="settings.enable_reactions"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Habilitar Reações</FormLabel>
                              <FormDescription>
                                Permitir likes e reações em posts
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="settings.enable_badges"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Habilitar Badges</FormLabel>
                              <FormDescription>
                                Sistema de badges e conquistas
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={communityForm.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Comunidade Ativa</FormLabel>
                              <FormDescription>
                                Desabilitar comunidade temporariamente
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Salvar Alterações
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
