"use client"
import React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { subjects } from '@/constants'
import { Textarea } from './ui/textarea'
import { createCompanion } from '@/lib/actions/companion.actions'
import {useRouter} from "next/navigation"
import { companionFormSchema, type CompanionFormValues } from '@/lib/validations/companion'

const CompanionForm = () => {
    const router = useRouter();

     // 1. Define your form.
    const form = useForm<CompanionFormValues>({
        resolver: zodResolver(companionFormSchema),
        defaultValues: {
            name: '',
            // Enums start unselected; the schema rejects the empty value on submit.
            subject: '' as CompanionFormValues['subject'],
            topic: '',
            voice: '' as CompanionFormValues['voice'],
            style: '' as CompanionFormValues['style'],
            duration: 15,
        },
    })

    // 2. Define a submit handler.
    const onSubmit = async (values: CompanionFormValues) => {
        try {
            const result = await createCompanion(values);
            if (!result.ok) {
                form.setError('root', { message: result.error });
                return;
            }
            router.push(`/companions/${result.companion.id}`);
        } catch (error) {
            console.error('Failed to create a companion', error);
            form.setError('root', { message: 'Failed to create a companion. Please try again.' });
        }
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Companion name</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter the companion name" {...field} 
                        className="input"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <SelectTrigger className="input capitalize">
                                <SelectValue placeholder="Select the subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                {subjects.map((subject) => (
                                    <SelectItem key={subject} value={subject} className="capitalize">
                                    {subject}
                                    </SelectItem>
                                ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>What should the companion help with?</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ex. Derivatives & Integrals" {...field} className="input"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="voice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Voice Type</FormLabel>
                    <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <SelectTrigger className="input">
                                <SelectValue placeholder="Select the voice" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="male">
                                        Male
                                    </SelectItem>
                                    <SelectItem value="female">
                                        Female
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Style</FormLabel>
                    <FormControl>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <SelectTrigger className="input">
                                <SelectValue placeholder="Select the style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="formal">
                                        Formal
                                    </SelectItem>
                                    <SelectItem value="casual">
                                        Casual
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estimated session duration in minutes</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="15" {...field} 
                        className="input"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {form.formState.errors.root && (
                    <p className="text-sm text-destructive" role="alert">
                        {form.formState.errors.root.message}
                    </p>
                )}
                <Button type="submit" className="w-full cursor-pointer" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Building...' : 'Build Your Companion'}
                </Button>
            </form>
        </Form>
    )
}

export default CompanionForm