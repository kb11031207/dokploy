import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { generateSHA256Hash } from "@/lib/utils";
import { api } from "@/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, User, X } from "lucide-react";
import { useTranslation } from "next-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Disable2FA } from "./disable-2fa";
import { Enable2FA } from "./enable-2fa";

const profileSchema = z.object({
	email: z.string(),
	password: z.string().nullable(),
	currentPassword: z.string().nullable(),
	image: z.string().optional(),
	allowImpersonation: z.boolean().optional().default(false),
});

type Profile = z.infer<typeof profileSchema>;

const randomImages = [
	"/avatars/avatar-1.png",
	"/avatars/avatar-2.png",
	"/avatars/avatar-3.png",
	"/avatars/avatar-4.png",
	"/avatars/avatar-5.png",
	"/avatars/avatar-6.png",
	"/avatars/avatar-7.png",
	"/avatars/avatar-8.png",
	"/avatars/avatar-9.png",
	"/avatars/avatar-10.png",
	"/avatars/avatar-11.png",
	"/avatars/avatar-12.png",
];

export const ProfileForm = () => {
	const _utils = api.useUtils();
	const { data, refetch, isLoading } = api.user.get.useQuery();
	const { data: isCloud } = api.settings.isCloud.useQuery();

	const {
		mutateAsync,
		isLoading: isUpdating,
		isError,
		error,
	} = api.user.update.useMutation();
	const { t } = useTranslation("settings");
	const [gravatarHash, setGravatarHash] = useState<string | null>(null);
	const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const validateImage = (base64String: string): Promise<boolean> => {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(true);
			img.onerror = () => resolve(false);
			img.src = base64String;
		});
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Prevent concurrent uploads
		if (isUploading) {
			toast.error("Please wait for the current upload to complete");
			return;
		}

		// Validate file type
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		// Validate file size (2MB = 2 * 1024 * 1024 bytes)
		const maxSize = 2 * 1024 * 1024;
		if (file.size > maxSize) {
			toast.error("Image size must be less than 2MB");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		setIsUploading(true);

		// Convert to base64 data URL
		const reader = new FileReader();
		reader.onloadend = async () => {
			try {
				const base64String = reader.result as string;
				
				// Validate that the image can actually load
				const isValidImage = await validateImage(base64String);
				if (!isValidImage) {
					toast.error("Invalid or corrupted image file");
					setIsUploading(false);
					if (fileInputRef.current) {
						fileInputRef.current.value = "";
					}
					return;
				}

				setUploadedImagePreview(base64String);
				form.setValue("image", base64String);
				setIsUploading(false);
			} catch (error) {
				toast.error("Error processing image file");
				setIsUploading(false);
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}
		};
		reader.onerror = () => {
			toast.error("Error reading image file");
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		};
		reader.readAsDataURL(file);
	};

	const handleRemoveUploadedImage = () => {
		setUploadedImagePreview(null);
		form.setValue("image", "");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const availableAvatars = useMemo(() => {
		if (gravatarHash === null) return randomImages;
		return randomImages.concat([
			`https://www.gravatar.com/avatar/${gravatarHash}`,
		]);
	}, [gravatarHash]);

	const form = useForm<Profile>({
		defaultValues: {
			email: data?.user?.email || "",
			password: "",
			image: data?.user?.image || "",
			currentPassword: "",
			allowImpersonation: data?.user?.allowImpersonation || false,
		},
		resolver: zodResolver(profileSchema),
	});

	useEffect(() => {
		if (data) {
			const currentImage = data?.user?.image || "";
			
			// Check if the current image is a base64 data URL (uploaded image)
			const isBase64Image = currentImage?.startsWith("data:image/");
			
			if (isBase64Image) {
				setUploadedImagePreview(currentImage);
			} else {
				setUploadedImagePreview(null);
			}

			form.reset(
				{
					email: data?.user?.email || "",
					password: form.getValues("password") || "",
					image: currentImage,
					currentPassword: form.getValues("currentPassword") || "",
					allowImpersonation: data?.user?.allowImpersonation,
				},
				{
					keepValues: true,
				},
			);
			form.setValue("allowImpersonation", data?.user?.allowImpersonation);

			if (data.user.email) {
				generateSHA256Hash(data.user.email).then((hash) => {
					setGravatarHash(hash);
				});
			}
		}
	}, [form, data]);

	const onSubmit = async (values: Profile) => {
		await mutateAsync({
			email: values.email.toLowerCase(),
			password: values.password || undefined,
			image: values.image,
			currentPassword: values.currentPassword || undefined,
			allowImpersonation: values.allowImpersonation,
		})
			.then(async () => {
				await refetch();
				toast.success("Profile Updated");
				form.reset({
					email: values.email,
					password: "",
					image: values.image,
					currentPassword: "",
				});
			})
			.catch(() => {
				toast.error("Error updating the profile");
			});
	};

	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar  p-2.5 rounded-xl  max-w-5xl mx-auto">
				<div className="rounded-xl bg-background shadow-md ">
					<CardHeader className="flex flex-row gap-2 flex-wrap justify-between items-center">
						<div>
							<CardTitle className="text-xl flex flex-row gap-2">
								<User className="size-6 text-muted-foreground self-center" />
								{t("settings.profile.title")}
							</CardTitle>
							<CardDescription>
								{t("settings.profile.description")}
							</CardDescription>
						</div>
						{!data?.user.twoFactorEnabled ? <Enable2FA /> : <Disable2FA />}
					</CardHeader>

					<CardContent className="space-y-2 py-8 border-t">
						{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
						{isLoading ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[35vh]">
								<span>Loading...</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : (
							<>
								<Form {...form}>
									<form
										onSubmit={form.handleSubmit(onSubmit)}
										className="grid gap-4"
									>
										<div className="space-y-4">
											<FormField
												control={form.control}
												name="email"
												render={({ field }) => (
													<FormItem>
														<FormLabel>{t("settings.profile.email")}</FormLabel>
														<FormControl>
															<Input
																placeholder={t("settings.profile.email")}
																{...field}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="currentPassword"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Current Password</FormLabel>
														<FormControl>
															<Input
																type="password"
																placeholder={t("settings.profile.password")}
																{...field}
																value={field.value || ""}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="password"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															{t("settings.profile.password")}
														</FormLabel>
														<FormControl>
															<Input
																type="password"
																placeholder={t("settings.profile.password")}
																{...field}
																value={field.value || ""}
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="image"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															{t("settings.profile.avatar")}
														</FormLabel>
														<FormControl>
															<div className="flex flex-row flex-wrap gap-2 max-xl:justify-center">
																<input
																	ref={fileInputRef}
																	type="file"
																	accept="image/*"
																	onChange={handleImageUpload}
																	disabled={isUploading}
																	className="hidden"
																/>
																<RadioGroup
																	onValueChange={(e) => {
																		field.onChange(e);
																		// Clear uploaded image when selecting a predefined avatar
																		if (!e.startsWith("data:image/")) {
																			setUploadedImagePreview(null);
																			if (fileInputRef.current) {
																				fileInputRef.current.value = "";
																			}
																		}
																	}}
																	defaultValue={field.value}
																	value={field.value}
																	className="flex flex-row flex-wrap gap-2 max-xl:justify-center"
																>
																	{/* Upload button / Uploaded image preview */}
																	{uploadedImagePreview ? (
																		<FormItem>
																			<FormLabel className="[&:has([data-state=checked])>img]:border-primary [&:has([data-state=checked])>img]:border-1 [&:has([data-state=checked])>img]:p-px cursor-pointer">
																				<FormControl>
																					<RadioGroupItem
																						value={uploadedImagePreview}
																						className="sr-only"
																					/>
																				</FormControl>
																				<div
																					onClick={() => {
																						if (!isUploading) {
																							fileInputRef.current?.click();
																						}
																					}}
																					className={`relative group ${
																						isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
																					}`}
																				>
																					<img
																						src={uploadedImagePreview}
																						alt="Uploaded avatar"
																						className="h-12 w-12 rounded-full border object-cover hover:p-px hover:border-primary transition-transform"
																					/>
																					{!isUploading && (
																						<button
																							type="button"
																							onClick={(e) => {
																								e.stopPropagation();
																								handleRemoveUploadedImage();
																							}}
																							className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
																							aria-label="Remove uploaded image"
																						>
																							<X className="h-3 w-3" />
																						</button>
																					)}
																				</div>
																			</FormLabel>
																		</FormItem>
																	) : (
																		<FormItem>
																			<FormLabel className="cursor-pointer">
																				<div
																					onClick={() => {
																						if (!isUploading) {
																							fileInputRef.current?.click();
																						}
																					}}
																					className={`h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/50 transition-colors flex items-center justify-center bg-muted/50 ${
																						isUploading
																							? "opacity-50 cursor-not-allowed"
																							: "hover:border-primary hover:bg-muted cursor-pointer"
																					}`}
																				>
																					{isUploading ? (
																						<Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
																					) : (
																						<Upload className="h-5 w-5 text-muted-foreground" />
																					)}
																				</div>
																			</FormLabel>
																		</FormItem>
																	)}

																	{/* Predefined avatars */}
																	{availableAvatars.map((image) => (
																		<FormItem key={image}>
																			<FormLabel className="[&:has([data-state=checked])>img]:border-primary [&:has([data-state=checked])>img]:border-1 [&:has([data-state=checked])>img]:p-px cursor-pointer">
																				<FormControl>
																					<RadioGroupItem
																						value={image}
																						className="sr-only"
																					/>
																				</FormControl>

																				<img
																					key={image}
																					src={image}
																					alt="avatar"
																					className="h-12 w-12 rounded-full border hover:p-px hover:border-primary transition-transform"
																				/>
																			</FormLabel>
																		</FormItem>
																	))}
																</RadioGroup>
															</div>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											{isCloud && (
												<FormField
													control={form.control}
													name="allowImpersonation"
													render={({ field }) => (
														<FormItem className="flex flex-row items-center justify-between p-3 mt-4 border rounded-lg shadow-sm">
															<div className="space-y-0.5">
																<FormLabel>Allow Impersonation</FormLabel>
																<FormDescription>
																	Enable this option to allow Dokploy Cloud
																	administrators to temporarily access your
																	account for troubleshooting and support
																	purposes. This helps them quickly identify and
																	resolve any issues you may encounter.
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
											)}
										</div>

										<div className="flex items-center justify-end gap-2">
											<Button type="submit" isLoading={isUpdating}>
												{t("settings.common.save")}
											</Button>
										</div>
									</form>
								</Form>
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
